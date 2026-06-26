"""Нормализация и сопоставление с целевым справочником (ТЗ 4.3).

Стратегия:
    1. Точное совпадение по service_name / synonyms.
    2. Нечёткий поиск (RapidFuzz) — быстрый baseline.
    3. (Опционально) семантический поиск по эмбеддингам sentence-transformers.

Порог автосопоставления конфигурируется (Config.MATCH_AUTO_THRESHOLD, по умолч. 0.85).
Ниже порога → позиция уходит в очередь unmatched на ручную разметку.
"""
import logging
from typing import Optional, Tuple

from config import Config
from models import Service

logger = logging.getLogger(__name__)


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


def match_service(raw_name: str, index=None) -> Tuple[Optional[Service], float]:
    """Вернуть (Service|None, score 0..1). Если score < AUTO_THRESHOLD — на ревью."""
    if index is None:
        index = _build_index()
    key = _normalize(raw_name)
    if not key:
        return None, 0.0

    # 1) точное совпадение
    if key in index:
        return index[key], 1.0

    # 2) нечёткий поиск
    try:
        from rapidfuzz import process, fuzz
        choice = process.extractOne(key, index.keys(), scorer=fuzz.token_sort_ratio)
        if choice:
            name, score, _ = choice
            return index[name], score / 100.0
    except ImportError:
        logger.warning('rapidfuzz не установлен — нечёткий матчинг отключён')

    return None, 0.0


def normalize_item(item, index=None):
    """Проставить item.service_id и item.match_score. Вернуть True, если автосопоставлено."""
    svc, score = match_service(item.service_name_raw, index)
    item.match_score = round(score, 4)
    if svc and score >= Config.MATCH_AUTO_THRESHOLD:
        item.service_id = svc.service_id
        return True
    item.service_id = None  # уходит в unmatched
    return False
