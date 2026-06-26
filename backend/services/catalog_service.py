"""Формирование целевого справочника услуг из загруженных прайсов (ТЗ §7).

Организатор может не дать готовый справочник — тогда команда формирует его сама
(ТЗ, раздел 7). Здесь мы строим справочник из уже извлечённых позиций прайсов:
    1. чистим сырые названия (срезаем коды/нумерацию, отсеиваем чистые коды),
    2. кластеризуем похожие названия (RapidFuzz) → одна услуга + синонимы,
    3. создаём записи Service,
    4. перепривязываем несопоставленные позиции к свежему справочнику.

После этого нормализация связывает позиции со справочником по точному совпадению
имени/синонима (а синонимами мы делаем в т.ч. исходные сырые названия — чтобы
автосопоставление сработало без потерь).
"""
import re
import logging
from collections import Counter

from models import db, Service, PriceItem
from services import normalization_service as norm

logger = logging.getLogger(__name__)

# Срезаем ведущую нумерацию разделов прайса: "12.1 ", "2.2.", "21.1  ", "3) "
_LEADING_CODE = re.compile(r'^\s*\d+(?:[.\-]\d+)*[.\)]?\s+')
# Полностью «кодовые» строки (цифры, точки, дефисы, слэши, короткие буквенные суффиксы)
_LETTERS = re.compile(r'[A-Za-zА-Яа-яЁё]')

# Ключевые слова для категории услуги (порядок проверки важен).
_CATEGORY_RULES = [
    ('лаборатория', ('анализ', 'кровь', 'моч', 'гемоглобин', 'оак', 'оам', 'биохим',
                     'гормон', 'инфекц', 'посев', 'цитолог', 'гистолог', 'коагул',
                     'глюкоз', 'холестерин', 'маркер', 'антител', 'пцр', 'ифа', 'соскоб')),
    ('диагностика', ('узи', 'мрт', 'кт ', 'томограф', 'рентген', 'флюор', 'экг', 'ээг',
                     'эхо', 'допплер', 'маммограф', 'денситометр', 'эндоскоп', 'гастроскоп',
                     'колоноскоп', 'фгдс', 'спирометр', 'холтер', 'диагностик')),
    ('консультация', ('консультац', 'прием', 'приём', 'осмотр', 'врач')),
    ('процедура', ('инъекц', 'укол', 'перевязк', 'массаж', 'физиотерап', 'капельниц',
                   'удаление', 'биопси', 'пункц', 'операц', 'хирург', 'процедур')),
]


def _clean_name(raw: str):
    """Очистить сырое название. Вернуть очищенное имя или None, если это код/мусор."""
    if not raw:
        return None
    name = raw.strip().strip('.;:').strip()
    name = _LEADING_CODE.sub('', name)        # срезать ведущую нумерацию
    name = re.sub(r'\s+', ' ', name).strip()
    # отсеиваем строки без осмысленного текста (нужно ≥3 букв)
    if len(_LETTERS.findall(name)) < 3:
        return None
    return name


def _guess_category(name: str) -> str:
    low = name.lower()
    for category, keys in _CATEGORY_RULES:
        if any(k in low for k in keys):
            return category
    return 'процедура'


def _norm_key(s: str) -> str:
    return ' '.join((s or '').lower().split())


def build_catalog_from_items(threshold: int = 90, only_unmatched: bool = True):
    """Построить справочник из позиций прайсов и перепривязать несопоставленные.

    threshold — порог схожести (token_sort_ratio 0..100) для склейки в одну услугу.
    only_unmatched — строить только по позициям без привязки (обычно их и нет, пока
    справочник пуст).
    Возвращает сводку: сколько уникальных названий, услуг создано, позиций привязано.
    """
    q = PriceItem.query.filter(PriceItem.is_active.is_(True))
    if only_unmatched:
        q = q.filter(PriceItem.service_id.is_(None))
    items = q.all()

    # частота исходных сырых названий (по числу позиций)
    raw_freq = Counter()
    for it in items:
        if it.service_name_raw and it.service_name_raw.strip():
            raw_freq[it.service_name_raw.strip()] += 1

    # очищенное имя -> {исходные сырые варианты, суммарная частота}
    cleaned = {}
    skipped_codes = 0
    for raw, cnt in raw_freq.items():
        name = _clean_name(raw)
        if not name:
            skipped_codes += 1
            continue
        entry = cleaned.setdefault(name, {'raws': set(), 'freq': 0})
        entry['raws'].add(raw)
        entry['freq'] += cnt

    # жадная кластеризация очищенных названий по схожести
    try:
        from rapidfuzz import fuzz
    except ImportError:
        fuzz = None
        logger.warning('rapidfuzz не установлен — кластеризация по точному совпадению')

    clusters = []  # [{canonical, names:set, raws:set, freq}]
    for name in sorted(cleaned, key=lambda n: -cleaned[n]['freq']):
        entry = cleaned[name]
        placed = False
        if fuzz is not None:
            nk = _norm_key(name)
            for cl in clusters:
                if fuzz.token_sort_ratio(nk, _norm_key(cl['canonical'])) >= threshold:
                    cl['names'].add(name)
                    cl['raws'].update(entry['raws'])
                    placed = True
                    break
        if not placed:
            clusters.append({'canonical': name, 'names': {name}, 'raws': set(entry['raws']),
                             'freq': entry['freq']})

    # создаём услуги (пропускаем уже существующие по имени)
    existing = {s.service_name.lower() for s in Service.query.all()}
    created = 0
    for cl in clusters:
        if cl['canonical'].lower() in existing:
            continue
        # синонимы: прочие очищенные варианты + исходные сырые названия (для точного матчинга)
        synonyms = sorted((cl['names'] | cl['raws']) - {cl['canonical']})
        svc = Service(service_name=cl['canonical'], synonyms=synonyms,
                      category=_guess_category(cl['canonical']))
        db.session.add(svc)
        existing.add(cl['canonical'].lower())
        created += 1
    db.session.flush()

    # перепривязка несопоставленных позиций к свежему справочнику
    index = norm._build_index()
    linked = 0
    for it in PriceItem.query.filter(PriceItem.is_active.is_(True),
                                     PriceItem.service_id.is_(None)).all():
        if norm.normalize_item(it, index):
            linked += 1

    db.session.commit()
    return {
        'unique_raw_names': len(raw_freq),
        'skipped_codes': skipped_codes,
        'clusters': len(clusters),
        'services_created': created,
        'services_total': Service.query.count(),
        'items_linked': linked,
    }


def export_catalog():
    """Текущий справочник в формате, совместимом с /catalog/import (ТЗ §7)."""
    return [{
        'service_name': s.service_name,
        'synonyms': s.synonyms or [],
        'category': s.category,
        'icd_code': s.icd_code,
        'is_active': s.is_active,
    } for s in Service.query.order_by(Service.category, Service.service_name).all()]


# ---------------------------------------------------------------------------
# Консолидация справочника: дедуп синонимов (ТЗ 4.3)
# ---------------------------------------------------------------------------
# Небольшой словарь медицинских аббревиатур для офлайн-нормализации (фолбэк
# без LLM). Расширяемый; LLM покрывает остальное.
_ABBR = {
    'оак': 'общий анализ крови',
    'оам': 'общий анализ мочи',
    'бак': 'биохимический анализ крови',
    'узи': 'ультразвуковое исследование',
    'обп': 'органов брюшной полости',
    'экг': 'электрокардиография',
    'ээг': 'электроэнцефалография',
    'кт': 'компьютерная томография',
    'мрт': 'магнитно-резонансная томография',
    'фгдс': 'фиброгастродуоденоскопия',
    'ифа': 'иммуноферментный анализ',
    'пцр': 'полимеразная цепная реакция',
}
_STOPWORDS = {'и', 'в', 'на', 'с', 'для', 'по', 'от', 'до', 'или', 'без', 'к'}


def _offline_key(name: str) -> str:
    """Нормализованный ключ для офлайн-группировки: нижний регистр, без кодов/
    пунктуации, аббревиатуры раскрыты, стоп-слова убраны, слова отсортированы.
    Так склеиваются варианты порядка слов и пунктуации («Анализ крови общий» и
    «Общий анализ крови»)."""
    s = _clean_name(name) or name or ''
    s = re.sub(r'[^\w\s]', ' ', s.lower())
    tokens = []
    for tok in s.split():
        tok = _ABBR.get(tok, tok)
        tokens.extend(t for t in tok.split() if t and t not in _STOPWORDS)
    return ' '.join(sorted(tokens))


def _items_count(service_id):
    return PriceItem.query.filter_by(service_id=service_id, is_active=True).count()


def consolidate_catalog(use_llm: bool = True):
    """Свести дубликаты-синонимы справочника к каноническому названию (ТЗ 4.3).

    Группировка: LLM-канонизация (если есть ключ) → ключ = каноническое имя;
    иначе офлайн-ключ (раскрытие аббревиатур + сортировка слов). Внутри группы
    выбирается основная услуга (с наибольшим числом позиций), остальные —
    сливаются: их позиции переносятся на основную, имена уходят в синонимы.
    """
    from services import llm_service

    services = Service.query.filter_by(is_active=True).all()
    names = [s.service_name for s in services]
    llm_map = llm_service.canonicalize_names(names) if use_llm else {}

    groups = {}   # key -> {'display', 'category', 'services':[]}
    for s in services:
        info = llm_map.get(s.service_name)
        if info and info.get('canonical'):
            key = _offline_key(info['canonical']) or info['canonical'].lower()
            display, category = info['canonical'], info.get('category') or s.category
        else:
            key = _offline_key(s.service_name) or s.service_name.lower()
            display, category = s.service_name, s.category
        g = groups.setdefault(key, {'display': display, 'category': category, 'services': []})
        g['services'].append(s)

    merged = 0
    for g in groups.values():
        svcs = g['services']
        primary = max(svcs, key=lambda s: _items_count(s.service_id))
        synonyms = set(primary.synonyms or [])
        for s in svcs:
            if s.service_id == primary.service_id:
                continue
            PriceItem.query.filter_by(service_id=s.service_id).update(
                {'service_id': primary.service_id}, synchronize_session=False)
            synonyms.add(s.service_name)
            synonyms.update(s.synonyms or [])
            db.session.delete(s)
            merged += 1
        primary.service_name = g['display']
        primary.category = g['category'] or _guess_category(g['display'])
        synonyms.discard(primary.service_name)
        primary.synonyms = sorted(synonyms)

    db.session.commit()
    return {
        'services_before': len(services),
        'services_after': Service.query.count(),
        'groups': len(groups),
        'merged_away': merged,
        'used_llm': bool(llm_map),
    }
