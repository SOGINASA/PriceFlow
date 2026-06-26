"""LLM-канонизация названий медицинских услуг (ТЗ 4.3 — нормализация).

Используется при консолидации справочника: для каждого сырого названия LLM
возвращает каноническое имя + категорию. Группировка потом идёт детерминированно
по каноническому имени (exact-merge), поэтому синонимы из разных батчей
надёжно сливаются — в отличие от просьбы «сгруппируй», где модель плохо
связывает элементы между запросами.

Провайдер — OpenAI-совместимый Chat Completions (по умолчанию Groq). Без ключа
функция возвращает {} и вызывающий код откатывается на офлайн-нормализацию.
"""
import json
import logging

from config import Config

logger = logging.getLogger(__name__)

_SYSTEM = (
    "Ты нормализуешь названия медицинских услуг из прайсов клиник (русский и "
    "казахский). Для каждого входного названия верни КАНОНИЧЕСКОЕ название "
    "услуги на русском: раскрой аббревиатуры (ОАК → Общий анализ крови, УЗИ ОБП "
    "→ УЗИ органов брюшной полости), убери номера разделов/коды/лишние уточнения, "
    "приведи синонимы к ОДНОЙ форме (одинаковые услуги → одинаковый canonical). "
    "Категория одна из: лаборатория, диагностика, консультация, процедура, прочее. "
    "Ответ строго JSON: {\"items\":[{\"input\":\"...\",\"canonical\":\"...\",\"category\":\"...\"}]} "
    "без пояснений."
)


def available() -> bool:
    return bool(Config.GROQ_API_KEY)


def canonicalize_names(names, batch_size=None):
    """names -> {input_name: {'canonical': str, 'category': str}}.

    Возвращает {} если ключа нет или все вызовы упали (вызывающий код делает
    офлайн-фолбэк). Частичный успех допустим — что распозналось, то и вернётся.
    """
    if not available() or not names:
        return {}
    batch_size = batch_size or Config.LLM_BATCH_SIZE
    uniq = list(dict.fromkeys(n for n in names if n and n.strip()))
    out = {}
    for i in range(0, len(uniq), batch_size):
        batch = uniq[i:i + batch_size]
        try:
            out.update(_canonicalize_batch(batch))
        except Exception as e:  # noqa: BLE001 — один упавший батч не рушит всё
            logger.warning('LLM canonicalize batch failed (%d..): %s', i, e)
    return out


def _canonicalize_batch(batch):
    import requests

    payload = {
        'model': Config.GROQ_MODEL,
        'temperature': 0,
        'response_format': {'type': 'json_object'},
        'messages': [
            {'role': 'system', 'content': _SYSTEM},
            {'role': 'user', 'content': json.dumps(batch, ensure_ascii=False)},
        ],
    }
    resp = requests.post(
        f'{Config.GROQ_BASE_URL}/chat/completions',
        headers={'Authorization': f'Bearer {Config.GROQ_API_KEY}',
                 'Content-Type': 'application/json'},
        json=payload, timeout=60,
    )
    resp.raise_for_status()
    content = resp.json()['choices'][0]['message']['content']
    data = json.loads(content)
    items = data.get('items') if isinstance(data, dict) else data
    result = {}
    for it in items or []:
        src = (it.get('input') or '').strip()
        canon = (it.get('canonical') or '').strip()
        if src and canon:
            result[src] = {'canonical': canon,
                           'category': (it.get('category') or '').strip() or None}
    return result
