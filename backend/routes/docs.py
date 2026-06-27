"""OpenAPI-спецификация и Swagger UI (ТЗ 4.5 — документация API обязательна).

Спецификация описана вручную как dict (источник истины) и отдаётся по
/api/openapi.json. Swagger UI рендерится статической страницей с CDN —
без дополнительных зависимостей.
"""
from flask import Blueprint, jsonify, Response

docs_bp = Blueprint('docs', __name__)


def _ok(schema_ref=None, description='OK', is_array=False):
    content = None
    if schema_ref:
        ref = {'$ref': f'#/components/schemas/{schema_ref}'}
        content = {'application/json': {'schema': {'type': 'array', 'items': ref} if is_array else ref}}
    resp = {'description': description}
    if content:
        resp['content'] = content
    return {'200': resp}


OPENAPI = {
    'openapi': '3.0.3',
    'info': {
        'title': 'MedArchive API',
        'version': '1.0.0',
        'description': 'Обработка архива прайс-листов клиник-партнёров, нормализация '
                       'услуг к справочнику и поиск цен (ТЗ Кейс 2, Med Partners).',
    },
    'servers': [{'url': '/api'}],
    'tags': [
        {'name': 'catalog', 'description': 'Целевой справочник услуг'},
        {'name': 'archives', 'description': 'Загрузка и обработка прайсов'},
        {'name': 'services', 'description': 'Услуги справочника'},
        {'name': 'partners', 'description': 'Клиники-партнёры'},
        {'name': 'search', 'description': 'Полнотекстовый поиск'},
        {'name': 'review', 'description': 'Очереди верификации (админ)'},
        {'name': 'dashboard', 'description': 'Метрики обработки'},
        {'name': 'rates', 'description': 'Курсы валют для пересчёта цен на дату прайса'},
        {'name': 'admin', 'description': 'Аутентификация админа/партнёра'},
    ],
    'paths': {
        '/catalog/import': {
            'post': {
                'tags': ['catalog'],
                'summary': 'Импорт целевого справочника услуг (JSON или XLSX)',
                'requestBody': {'content': {
                    'application/json': {'schema': {'type': 'array', 'items': {'$ref': '#/components/schemas/Service'}}},
                    'multipart/form-data': {'schema': {'type': 'object', 'properties': {'file': {'type': 'string', 'format': 'binary'}}}},
                }},
                'responses': _ok(description='Кол-во созданных/обновлённых записей'),
            }
        },
        '/archives': {
            'post': {
                'tags': ['archives'],
                'summary': 'Загрузить ZIP-архив или отдельные прайс-файлы',
                'parameters': [{'name': 'sync', 'in': 'query', 'schema': {'type': 'string', 'enum': ['1']},
                                'description': 'sync=1 — обработать синхронно (без Celery)'}],
                'requestBody': {'content': {'multipart/form-data': {'schema': {'type': 'object', 'properties': {
                    'file': {'type': 'string', 'format': 'binary', 'description': 'ZIP-архив'},
                    'files': {'type': 'array', 'items': {'type': 'string', 'format': 'binary'}, 'description': 'Отдельные файлы'},
                }}}}},
                'responses': {'201': {'description': 'Документы поставлены в очередь'}},
            },
            'get': {
                'tags': ['archives'],
                'summary': 'Список документов с фильтром по статусу',
                'parameters': [{'name': 'status', 'in': 'query', 'schema': {'$ref': '#/components/schemas/ParseStatus'}}],
                'responses': _ok('PriceDocument', is_array=True),
            },
        },
        '/archives/{doc_id}': {
            'get': {
                'tags': ['archives'],
                'summary': 'Статус обработки документа',
                'parameters': [{'name': 'doc_id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
                'responses': _ok('PriceDocument'),
            }
        },
        '/services': {
            'get': {
                'tags': ['services'],
                'summary': 'Список услуг справочника',
                'parameters': [{'name': 'category', 'in': 'query', 'schema': {'type': 'string'}}],
                'responses': _ok('Service', is_array=True),
            }
        },
        '/services/{service_id}/partners': {
            'get': {
                'tags': ['services'],
                'summary': 'Кто оказывает услугу и по какой цене',
                'parameters': [{'name': 'service_id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
                'responses': _ok(),
            }
        },
        '/partners': {
            'get': {
                'tags': ['partners'],
                'summary': 'Список партнёров',
                'parameters': [
                    {'name': 'city', 'in': 'query', 'schema': {'type': 'string'}},
                    {'name': 'is_active', 'in': 'query', 'schema': {'type': 'boolean'}},
                ],
                'responses': _ok('Partner', is_array=True),
            }
        },
        '/partners/{partner_id}': {
            'get': {
                'tags': ['partners'],
                'summary': 'Карточка партнёра',
                'parameters': [{'name': 'partner_id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
                'responses': _ok('Partner'),
            }
        },
        '/partners/{partner_id}/services': {
            'get': {
                'tags': ['partners'],
                'summary': 'Полный прайс партнёра',
                'parameters': [{'name': 'partner_id', 'in': 'path', 'required': True, 'schema': {'type': 'string'}}],
                'responses': _ok(),
            }
        },
        '/search': {
            'get': {
                'tags': ['search'],
                'summary': 'Полнотекстовый поиск по услугам и партнёрам',
                'parameters': [{'name': 'q', 'in': 'query', 'required': True, 'schema': {'type': 'string'}}],
                'responses': _ok(),
            }
        },
        '/unmatched': {
            'get': {'tags': ['review'], 'summary': 'Несопоставленные позиции',
                    'responses': _ok('PriceItem', is_array=True)}
        },
        '/needs-review': {
            'get': {'tags': ['review'], 'summary': 'Позиции с аномалиями для верификации',
                    'responses': _ok('PriceItem', is_array=True)}
        },
        '/match': {
            'post': {
                'tags': ['review'],
                'summary': 'Ручное сопоставление позиции с услугой справочника',
                'requestBody': {'content': {'application/json': {'schema': {'type': 'object', 'properties': {
                    'item_id': {'type': 'string'}, 'service_id': {'type': 'string'},
                    'new_service_name': {'type': 'string'}, 'note': {'type': 'string'}}}}}},
                'responses': _ok('PriceItem'),
            }
        },
        '/verify': {
            'post': {
                'tags': ['review'],
                'summary': 'Подтвердить / отклонить / скорректировать позицию',
                'requestBody': {'content': {'application/json': {'schema': {'type': 'object', 'properties': {
                    'item_id': {'type': 'string'},
                    'action': {'type': 'string', 'enum': ['confirm', 'reject', 'correct']},
                    'price_resident': {'type': 'number'}, 'price_nonresident': {'type': 'number'},
                    'note': {'type': 'string'}}}}}},
                'responses': _ok('PriceItem'),
            }
        },
        '/dashboard/stats': {
            'get': {'tags': ['dashboard'], 'summary': 'Метрики обработки и % нормализации',
                    'responses': _ok()}
        },
        '/rates': {
            'get': {
                'tags': ['rates'],
                'summary': 'Сохранённые курсы валют к KZT',
                'parameters': [{'name': 'currency', 'in': 'query', 'schema': {'type': 'string', 'enum': ['USD', 'RUB']}}],
                'responses': _ok('ExchangeRate', is_array=True),
            },
            'post': {
                'tags': ['rates'],
                'summary': 'Задать/обновить курс вручную',
                'requestBody': {'content': {'application/json': {'schema': {'type': 'object', 'properties': {
                    'currency': {'type': 'string', 'enum': ['USD', 'RUB']},
                    'date': {'type': 'string', 'format': 'date'}, 'rate': {'type': 'number'}}}}}},
                'responses': _ok(),
            },
        },
        '/rates/refresh': {
            'post': {
                'tags': ['rates'],
                'summary': 'Подтянуть курсы НБ РК на дату или диапазон',
                'requestBody': {'content': {'application/json': {'schema': {'type': 'object', 'properties': {
                    'date': {'type': 'string', 'format': 'date'},
                    'start': {'type': 'string', 'format': 'date'}, 'end': {'type': 'string', 'format': 'date'}}}}}},
                'responses': _ok(),
            }
        },
        '/rates/convert': {
            'get': {
                'tags': ['rates'],
                'summary': 'Превью пересчёта суммы в KZT по курсу на дату прайса',
                'parameters': [
                    {'name': 'amount', 'in': 'query', 'required': True, 'schema': {'type': 'number'}},
                    {'name': 'currency', 'in': 'query', 'schema': {'type': 'string', 'enum': ['KZT', 'USD', 'RUB']}},
                    {'name': 'date', 'in': 'query', 'schema': {'type': 'string', 'format': 'date'}},
                ],
                'responses': _ok(),
            }
        },
        '/admin/login': {
            'post': {
                'tags': ['admin'],
                'summary': 'Вход админа/партнёра (возвращает JWT)',
                'requestBody': {'content': {'application/json': {'schema': {'type': 'object', 'properties': {
                    'username': {'type': 'string'}, 'password': {'type': 'string'}}}}}},
                'responses': _ok(),
            }
        },
    },
    'components': {
        'schemas': {
            'ParseStatus': {'type': 'string', 'enum': ['pending', 'processing', 'done', 'error', 'needs_review']},
            'Service': {'type': 'object', 'properties': {
                'service_id': {'type': 'string'}, 'service_name': {'type': 'string'},
                'synonyms': {'type': 'array', 'items': {'type': 'string'}},
                'category': {'type': 'string'}, 'icd_code': {'type': 'string'},
                'is_active': {'type': 'boolean'}}},
            'Partner': {'type': 'object', 'properties': {
                'partner_id': {'type': 'string'}, 'name': {'type': 'string'}, 'city': {'type': 'string'},
                'address': {'type': 'string'}, 'bin': {'type': 'string'},
                'contact_email': {'type': 'string'}, 'contact_phone': {'type': 'string'},
                'is_active': {'type': 'boolean'}}},
            'PriceDocument': {'type': 'object', 'properties': {
                'doc_id': {'type': 'string'}, 'partner_id': {'type': 'string'},
                'file_name': {'type': 'string'}, 'file_format': {'type': 'string'},
                'effective_date': {'type': 'string'}, 'parse_status': {'$ref': '#/components/schemas/ParseStatus'},
                'parse_log': {'type': 'string'}}},
            'PriceItem': {'type': 'object', 'properties': {
                'item_id': {'type': 'string'}, 'doc_id': {'type': 'string'}, 'partner_id': {'type': 'string'},
                'service_id': {'type': 'string'}, 'service_name_raw': {'type': 'string'},
                'price_resident_kzt': {'type': 'number'}, 'price_nonresident_kzt': {'type': 'number'},
                'price_original': {'type': 'number'},
                'currency_original': {'type': 'string'}, 'match_score': {'type': 'number'},
                'is_verified': {'type': 'boolean'}, 'has_anomaly': {'type': 'boolean'},
                'is_active': {'type': 'boolean'}}},
            'ExchangeRate': {'type': 'object', 'properties': {
                'id': {'type': 'integer'}, 'currency': {'type': 'string', 'enum': ['USD', 'RUB']},
                'date': {'type': 'string', 'format': 'date'}, 'rate': {'type': 'number'},
                'source': {'type': 'string', 'enum': ['nbk', 'fallback', 'manual']},
                'fetched_at': {'type': 'string'}}},
        }
    },
}

_SWAGGER_HTML = """<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>MedArchive API — Swagger</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({ url: '/api/openapi.json', dom_id: '#swagger-ui' });
  </script>
</body>
</html>"""


@docs_bp.route('/openapi.json')
def openapi_json():
    return jsonify(OPENAPI)


@docs_bp.route('/docs')
def swagger_ui():
    return Response(_SWAGGER_HTML, mimetype='text/html')
