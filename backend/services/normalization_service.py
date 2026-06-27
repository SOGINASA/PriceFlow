"""Нормализация и сопоставление с целевым справочником (ТЗ 4.3) + дообучение.

Стратегия (tiers, по возрастанию стоимости):
    1. Точное совпадение по service_name / synonyms.
    2. Нечёткий поиск (RapidFuzz) — быстрый baseline.
    3. (Уровень 2, ВКЛ по умолчанию) семантический поиск по эмбеддингам
       sentence-transformers — ловит перефразы/аббревиатуры и устойчив к части
       мусора PDF/OCR; отключается Config.SEMANTIC_MATCH_ENABLED=false.

Порог автосопоставления конфигурируется (Config.MATCH_AUTO_THRESHOLD, по умолч. 0.85).
Ниже порога → позиция уходит в очередь unmatched на ручную разметку.

Дообучение (уровень 1): learn_synonym() — когда оператор вручную сопоставляет
позицию, её сырое название становится синонимом услуги. Тогда _build_index()
подхватит его и следующий такой же текст сопоставится автоматически (exact, 1.0).
"""
import logging
from typing import Optional, Tuple

from config import Config
from models import db, Service, LearnedSynonym

logger = logging.getLogger(__name__)

# методы сопоставления (пишутся в PriceItem.match_method)
EXACT, FUZZY, SEMANTIC, MANUAL = 'exact', 'fuzzy', 'semantic', 'manual'


def _normalize(s: str) -> str:
    return ' '.join((s or '').lower().split())


def _build_index():
    """Карта 'нормализованное имя/синоним' -> Service. Для MVP читается из БД на каждый
    батч; на больших объёмах кэшировать или вынести в Redis."""
    index = {}
    for svc in Service.query.filter_by(is_active=True).all():
        index[_normalize(svc.service_name)] = svc
        for syn in (svc.synonyms or []):
            index[_normalize(syn)] = svc
    return index


def match_service(raw_name: str, index=None) -> Tuple[Optional[Service], float, Optional[str]]:
    """Вернуть (Service|None, score 0..1, method). method ∈ {exact, fuzzy, semantic, None}.

    Если score < AUTO_THRESHOLD — позиция уходит на ревью (см. normalize_item)."""
    if index is None:
        index = _build_index()
    key = _normalize(raw_name)
    if not key:
        return None, 0.0, None

    # 1) точное совпадение
    if key in index:
        return index[key], 1.0, EXACT

    # 2) нечёткий поиск
    best_svc, best_score = None, 0.0
    try:
        from rapidfuzz import process, fuzz
        choice = process.extractOne(key, index.keys(), scorer=fuzz.token_sort_ratio)
        if choice:
            name, score, _ = choice
            best_svc, best_score = index[name], score / 100.0
    except ImportError:
        logger.warning('rapidfuzz не установлен — нечёткий матчинг отключён')

    if best_svc is not None and best_score >= Config.MATCH_AUTO_THRESHOLD:
        return best_svc, best_score, FUZZY

    # 3) семантический tier (уровень 2) — только если нечёткое не дотянуло до порога
    sem_svc, sem_score = _semantic_match(raw_name)
    if sem_svc is not None and sem_score >= max(best_score, Config.SEMANTIC_THRESHOLD):
        return sem_svc, sem_score, SEMANTIC

    # вернуть лучший нечёткий (ниже порога) как подсказку для оператора
    return best_svc, best_score, (FUZZY if best_svc is not None else None)


def normalize_item(item, index=None):
    """Проставить item.service_id, item.match_score, item.match_method.
    Вернуть True, если автосопоставлено (score >= порога)."""
    svc, score, method = match_service(item.service_name_raw, index)
    item.match_score = round(score, 4)
    if svc and score >= Config.MATCH_AUTO_THRESHOLD:
        item.service_id = svc.service_id
        item.match_method = method
        return True
    item.service_id = None  # уходит в unmatched
    item.match_method = None
    return False


# ---------------------------------------------------------------------------
# Дообучение, уровень 1: синонимы из ручных правок оператора
# ---------------------------------------------------------------------------
def learn_synonym(service: Service, raw_name: str, source: str = 'operator_match',
                  created_by: str = None) -> bool:
    """Запомнить сырое название как синоним услуги (дообучение, ТЗ 4.3).

    Добавляет raw_name в service.synonyms (без дублей) и пишет запись аудита в
    LearnedSynonym. Идемпотентно: повторное обучение тем же текстом — no-op.
    Возвращает True, если синоним был новым. Коммит — на стороне вызывающего.
    """
    if not service or not raw_name or not raw_name.strip():
        return False
    raw_name = raw_name.strip()
    norm = _normalize(raw_name)
    if not norm:
        return False

    # не учим, если это и есть каноническое имя или уже среди синонимов
    existing = {_normalize(service.service_name)} | {_normalize(s) for s in (service.synonyms or [])}
    is_new = norm not in existing
    if is_new:
        # JSON-колонка: переприсваиваем список, чтобы SQLAlchemy увидел изменение
        service.synonyms = sorted(set(service.synonyms or []) | {raw_name})

    # аудит обучения (uniq по service_id+normalized) — даже если синоним уже был,
    # запись может отсутствовать (синоним пришёл из импорта) → фиксируем факт.
    exists = LearnedSynonym.query.filter_by(service_id=service.service_id, normalized=norm).first()
    if not exists:
        db.session.add(LearnedSynonym(
            service_id=service.service_id, raw_name=raw_name, normalized=norm,
            source=source, created_by=created_by,
        ))
    return is_new


# ---------------------------------------------------------------------------
# Дообучение, уровень 2: семантическое сопоставление по эмбеддингам (опционально)
# ---------------------------------------------------------------------------
_model = None              # ленивый синглтон SentenceTransformer
_sem_cache = None          # (signature, services:list[Service], emb:ndarray-нормализованный)


def _get_model():
    """Загрузить (один раз) модель эмбеддингов. None, если выключено/не установлено."""
    global _model
    if not Config.SEMANTIC_MATCH_ENABLED:
        return None
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer(Config.SEMANTIC_MODEL)
            logger.info('semantic matcher: загружена модель %s', Config.SEMANTIC_MODEL)
        except Exception as e:  # noqa: BLE001 — пакет не установлен или модель не скачалась
            logger.warning('semantic matcher отключён (%s). pip install sentence-transformers', e)
            _model = False  # отметка «пробовали, не вышло» — больше не пытаемся
    return _model or None


def invalidate_semantic_cache():
    """Сбросить кэш эмбеддингов справочника (после import/build/consolidate)."""
    global _sem_cache
    _sem_cache = None


def _catalog_embeddings(model):
    """Список service_id активных услуг + матрица нормализованных эмбеддингов их
    канонических названий (кэшируется; перестраивается при изменении числа услуг).

    ВАЖНО: кэшируем только идентификаторы, НЕ ORM-объекты Service. Объекты привязаны
    к сессии БД, в которой были загружены; на следующем запросе сессия другая и
    закэшированный объект становится detached → DetachedInstanceError при чтении
    любого его атрибута. Поэтому возвращаем id, а услугу подгружаем в текущей сессии.
    """
    global _sem_cache
    import numpy as np
    services = Service.query.filter_by(is_active=True).all()
    signature = (len(services), sum(len(s.service_name or '') for s in services))
    if _sem_cache and _sem_cache[0] == signature:
        return _sem_cache[1], _sem_cache[2]
    if not services:
        _sem_cache = (signature, [], None)
        return [], None
    emb = model.encode([s.service_name for s in services],
                       convert_to_numpy=True, normalize_embeddings=True)
    ids = [s.service_id for s in services]
    _sem_cache = (signature, ids, np.asarray(emb, dtype='float32'))
    return ids, _sem_cache[2]


def _semantic_match(raw_name: str) -> Tuple[Optional[Service], float]:
    """Ближайшая услуга по косинусной близости эмбеддингов. (None, 0.0) если выключено."""
    model = _get_model()
    if model is None:
        return None, 0.0
    try:
        import numpy as np
        ids, mat = _catalog_embeddings(model)
        if mat is None or not ids:
            return None, 0.0
        q = model.encode([raw_name], convert_to_numpy=True, normalize_embeddings=True)[0]
        sims = mat @ np.asarray(q, dtype='float32')   # косинус (всё нормализовано)
        i = int(sims.argmax())
        # услугу берём в ТЕКУЩЕЙ сессии по id (кэш хранит только id — см. выше)
        svc = db.session.get(Service, ids[i])
        if svc is None:
            return None, 0.0
        return svc, float(sims[i])
    except Exception as e:  # noqa: BLE001
        logger.warning('semantic match failed: %s', e)
        return None, 0.0
