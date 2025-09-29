from server.app     import app
from server.website import Website
from server.backend import Backend_Api
from flask_cors import CORS

from json import load
from dotenv import load_dotenv
import os

# Загрузка переменных окружения
load_dotenv()

if __name__ == '__main__':
    # Настройка CORS
    CORS(app)
    
    # Конфигурация из config.json или переменных окружения
    try:
        config = load(open('config.json', 'r'))
        site_config = config.get('site_config', {})
    except FileNotFoundError:
        print("ℹ️ config.json не найден, используем переменные окружения")
        config = {}
        site_config = {}
    
    # Настройки по умолчанию из переменных окружения
    site_config.setdefault('host', os.getenv('HOST', '0.0.0.0'))
    site_config.setdefault('port', int(os.getenv('PORT', 5000)))
    site_config.setdefault('debug', os.getenv('FLASK_DEBUG', 'True').lower() == 'true')
    
    # Инициализация веб-сайта
    site = Website(app)
    for route in site.routes:
        app.add_url_rule(
            route,
            view_func = site.routes[route]['function'],
            methods   = site.routes[route]['methods'],
        )

    # Инициализация API
    backend_api  = Backend_Api(app, config)
    for route in backend_api.routes:
        app.add_url_rule(
            route,
            view_func = backend_api.routes[route]['function'],
            methods   = backend_api.routes[route]['methods'],
        )

    print("\n🚀 Запуск Multi-AI Chat Platform...")
    print(f"🌐 Сервер запущен на: http://{site_config['host']}:{site_config['port']}")
    print(f"📊 API эндпойнты:")
    print(f"  - GET  /api/models - Список AI моделей")
    print(f"  - GET  /api/pricing - Тарифные планы")
    print(f"  - POST /backend-api/v2/conversation - Чат API")
    print("\n✨ Для полной функциональности добавьте API ключи в .env файл")
    
    app.run(**site_config)
