import requests
from bs4 import BeautifulSoup
import re
import time
from urllib.parse import urlparse, urljoin
from typing import Dict, List, Optional
import json
import logging

class WebScraper:
    """
    Класс для извлечения содержимого веб-страниц
    """
    
    def __init__(self):
        self.session = requests.Session()
        # Устанавливаем реалистичный User-Agent
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
        
        # Специальные правила для разных сайтов
        self.site_rules = {
            'otomoto.pl': self._parse_otomoto,
            'youtube.com': self._parse_youtube,
            'youtu.be': self._parse_youtube,
            'reddit.com': self._parse_reddit,
            'wikipedia.org': self._parse_wikipedia,
            'drive2.ru': self._parse_drive2,
            'auto.ru': self._parse_auto_ru,
            'carsguru.net': self._parse_carsguru,
            'drom.ru': self._parse_drom,
            'motor.ru': self._parse_motor_ru,
            'autogeek.pl': self._parse_autogeek,
            'autokult.pl': self._parse_autokult,
            'whatcar.pl': self._parse_whatcar,
        }
        
    def scrape_url(self, url: str) -> Dict:
        """
        Основная функция для извлечения содержимого страницы
        
        Args:
            url: URL страницы для анализа
            
        Returns:
            Dict с извлеченным содержимым
        """
        try:
            # Проверяем URL
            parsed_url = urlparse(url)
            if not parsed_url.scheme:
                url = 'https://' + url
                parsed_url = urlparse(url)
            
            domain = parsed_url.netloc.lower()
            
            print(f"🌐 Анализирую страницу: {url}")
            
            # Делаем запрос
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            # Парсим HTML
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Базовая информация
            result = {
                'url': url,
                'domain': domain,
                'title': self._get_title(soup),
                'description': self._get_description(soup),
                'content': '',
                'images': [],
                'links': [],
                'structured_data': {},
                'success': True,
                'error': None
            }
            
            # Применяем специальные правила для конкретных сайтов
            site_handler = None
            for site_pattern, handler in self.site_rules.items():
                if site_pattern in domain:
                    site_handler = handler
                    break
            
            if site_handler:
                try:
                    structured_data = site_handler(soup, url)
                    result['structured_data'] = structured_data
                except Exception as e:
                    print(f"⚠️ Ошибка специального парсера для {domain}: {e}")
            
            # Общее извлечение содержимого
            result['content'] = self._extract_general_content(soup)
            result['images'] = self._extract_images(soup, url)[:5]  # Ограничиваем до 5 изображений
            result['links'] = self._extract_links(soup, url)[:10]  # Ограничиваем до 10 ссылок
            
            return result
            
        except requests.exceptions.RequestException as e:
            return {
                'url': url,
                'success': False,
                'error': f'Ошибка загрузки страницы: {str(e)}',
                'content': None
            }
        except Exception as e:
            return {
                'url': url,
                'success': False,
                'error': f'Ошибка обработки: {str(e)}',
                'content': None
            }
    
    def _get_title(self, soup: BeautifulSoup) -> str:
        """Извлекает заголовок страницы"""
        title_tag = soup.find('title')
        if title_tag:
            return title_tag.get_text().strip()
        return "Заголовок не найден"
    
    def _get_description(self, soup: BeautifulSoup) -> str:
        """Извлекает описание страницы из meta тегов"""
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc:
            return meta_desc.get('content', '').strip()
        
        # Пробуем Open Graph
        og_desc = soup.find('meta', attrs={'property': 'og:description'})
        if og_desc:
            return og_desc.get('content', '').strip()
        
        return "Описание не найдено"
    
    def _extract_general_content(self, soup: BeautifulSoup) -> str:
        """Извлекает основной текстовый контент страницы"""
        # Удаляем ненужные элементы
        for element in soup(['script', 'style', 'nav', 'header', 'footer', 'aside']):
            element.decompose()
        
        # Пробуем найти основной контент
        main_content = soup.find('main') or soup.find('article') or soup.find('div', class_='content')
        
        if main_content:
            text = main_content.get_text(separator=' ', strip=True)
        else:
            text = soup.get_text(separator=' ', strip=True)
        
        # Очищаем и сокращаем текст
        text = re.sub(r'\s+', ' ', text)
        return text[:5000]  # Ограничиваем размер
    
    def _extract_images(self, soup: BeautifulSoup, base_url: str) -> List[Dict]:
        """Извлекает информацию об изображениях"""
        images = []
        for img in soup.find_all('img', src=True):
            src = img['src']
            if src.startswith('//'):
                src = 'https:' + src
            elif src.startswith('/'):
                src = urljoin(base_url, src)
            
            images.append({
                'url': src,
                'alt': img.get('alt', ''),
                'title': img.get('title', '')
            })
        
        return images
    
    def _extract_links(self, soup: BeautifulSoup, base_url: str) -> List[Dict]:
        """Извлекает внешние ссылки"""
        links = []
        for link in soup.find_all('a', href=True):
            href = link['href']
            if href.startswith('http'):
                links.append({
                    'url': href,
                    'text': link.get_text(strip=True),
                    'title': link.get('title', '')
                })
        
        return links
    
    def _parse_otomoto(self, soup: BeautifulSoup, url: str) -> Dict:
        """Специальный парсер для OtoMoto"""
        data = {
            'type': 'car_listing',
            'price': None,
            'car_details': {},
            'seller_info': {},
            'description': '',
            'images': [],
            'main_image': None
        }
        
        # Цена
        price_elem = soup.find('span', class_='offer-price__number')
        if price_elem:
            data['price'] = price_elem.get_text().strip()
        
        # Детали автомобиля из таблицы параметров
        param_items = soup.find_all('li', class_='offer-params__item')
        for item in param_items:
            label_elem = item.find('span', class_='offer-params__label')
            value_elem = item.find('div', class_='offer-params__value') or item.find('a', class_='offer-params__value')
            
            if label_elem and value_elem:
                label = label_elem.get_text().strip().rstrip(':')
                value = value_elem.get_text().strip()
                data['car_details'][label] = value
        
        # Описание продавца
        desc_elem = soup.find('div', class_='offer-description__description')
        if desc_elem:
            data['description'] = desc_elem.get_text().strip()
        
        # Извлекаем изображения автомобиля
        images = []
        
        # Пробуем найти главное изображение
        main_img = soup.find('img', class_='bigImage')
        if not main_img:
            main_img = soup.find('img', attrs={'data-src': True})
        if not main_img:
            # Поиск любых больших изображений в галерее
            gallery_imgs = soup.find_all('img', attrs={'src': re.compile(r'.*\.(jpg|jpeg|png|webp)', re.I)})
            for img in gallery_imgs:
                src = img.get('src') or img.get('data-src')
                if src and 'placeholder' not in src.lower() and 'logo' not in src.lower():
                    if src.startswith('//'):
                        src = 'https:' + src
                    elif src.startswith('/'):
                        src = 'https://otomoto.pl' + src
                    
                    images.append({
                        'url': src,
                        'alt': img.get('alt', ''),
                        'title': 'Car image'
                    })
        
        if main_img:
            main_src = main_img.get('src') or main_img.get('data-src')
            if main_src:
                if main_src.startswith('//'):
                    main_src = 'https:' + main_src
                elif main_src.startswith('/'):
                    main_src = 'https://otomoto.pl' + main_src
                
                data['main_image'] = main_src
                images.insert(0, {
                    'url': main_src,
                    'alt': main_img.get('alt', ''),
                    'title': 'Main car image'
                })
        
        data['images'] = images[:6]  # Ограничиваем 6 изображениями
        
        return data
    
    def _parse_youtube(self, soup: BeautifulSoup, url: str) -> Dict:
        """Специальный парсер для YouTube"""
        data = {
            'type': 'youtube_video',
            'video_title': '',
            'channel': '',
            'description': '',
            'views': '',
            'upload_date': ''
        }
        
        # Заголовок видео
        title_elem = soup.find('meta', {'property': 'og:title'})
        if title_elem:
            data['video_title'] = title_elem.get('content', '')
        
        # Описание
        desc_elem = soup.find('meta', {'property': 'og:description'})
        if desc_elem:
            data['description'] = desc_elem.get('content', '')
        
        return data
    
    def _parse_reddit(self, soup: BeautifulSoup, url: str) -> Dict:
        """Специальный парсер для Reddit"""
        data = {
            'type': 'reddit_post',
            'title': '',
            'subreddit': '',
            'author': '',
            'content': ''
        }
        
        # Заголовок поста
        title_elem = soup.find('h1')
        if title_elem:
            data['title'] = title_elem.get_text().strip()
        
        return data
    
    def _parse_wikipedia(self, soup: BeautifulSoup, url: str) -> Dict:
        """Специальный парсер для Wikipedia"""
        data = {
            'type': 'wikipedia_article',
            'title': '',
            'summary': '',
            'categories': []
        }
        
        # Заголовок статьи
        title_elem = soup.find('h1', class_='firstHeading')
        if title_elem:
            data['title'] = title_elem.get_text().strip()
        
        # Краткое содержание (первый абзац)
        first_para = soup.find('div', class_='mw-parser-output')
        if first_para:
            para = first_para.find('p')
            if para:
                data['summary'] = para.get_text().strip()
        
        return data
    
    def _parse_drive2(self, soup: BeautifulSoup, url: str) -> Dict:
        """Специальный парсер для Drive2.ru"""
        data = {
            'type': 'drive2_review',
            'title': '',
            'author': '',
            'car_model': '',
            'review_text': '',
            'rating': None,
            'pros_cons': {'pros': [], 'cons': []}
        }
        
        # Заголовок поста
        title_elem = soup.find('h1', class_='c-title')
        if title_elem:
            data['title'] = title_elem.get_text().strip()
        
        # Автор
        author_elem = soup.find('a', class_='c-username')
        if author_elem:
            data['author'] = author_elem.get_text().strip()
        
        # Текст отзыва
        content_elem = soup.find('div', class_='c-post-text')
        if content_elem:
            data['review_text'] = content_elem.get_text()[:2000]
        
        return data
    
    def _parse_auto_ru(self, soup: BeautifulSoup, url: str) -> Dict:
        """Специальный парсер для Auto.ru"""
        data = {
            'type': 'auto_ru_listing',
            'price': None,
            'car_details': {},
            'description': '',
            'location': ''
        }
        
        # Цена
        price_elem = soup.find('span', class_='OfferPriceCaption__price')
        if price_elem:
            data['price'] = price_elem.get_text().strip()
        
        return data
    
    def _parse_carsguru(self, soup: BeautifulSoup, url: str) -> Dict:
        """Специальный парсер для CarsGuru.net"""
        data = {
            'type': 'carsguru_review',
            'car_model': '',
            'overall_rating': None,
            'category_ratings': {},
            'review_summary': ''
        }
        
        return data
    
    def _parse_drom(self, soup: BeautifulSoup, url: str) -> Dict:
        """Специальный парсер для Drom.ru"""
        data = {
            'type': 'drom_listing',
            'price': None,
            'car_details': {},
            'seller_type': ''
        }
        
        return data
    
    def _parse_motor_ru(self, soup: BeautifulSoup, url: str) -> Dict:
        """Специальный парсер для Motor.ru"""
        data = {
            'type': 'motor_review',
            'article_type': '',
            'car_model': '',
            'expert_opinion': '',
            'test_results': {}
        }
        
        return data
    
    def _parse_autogeek(self, soup: BeautifulSoup, url: str) -> Dict:
        """Специальный парсер для AutoGeek.pl"""
        data = {
            'type': 'autogeek_article',
            'title': '',
            'category': '',
            'content': ''
        }
        
        return data
    
    def _parse_autokult(self, soup: BeautifulSoup, url: str) -> Dict:
        """Специальный парсер для AutoKult.pl"""
        data = {
            'type': 'autokult_review',
            'title': '',
            'car_model': '',
            'rating': None
        }
        
        return data
    
    def _parse_whatcar(self, soup: BeautifulSoup, url: str) -> Dict:
        """Специальный парсер для WhatCar.pl"""
        data = {
            'type': 'whatcar_review',
            'title': '',
            'expert_rating': None,
            'user_rating': None
        }
        
        return data

class ReviewSearcher:
    """Класс для интеллектуального поиска отзывов о автомобилях"""
    
    def __init__(self):
        self.scraper = WebScraper()
        
        # Популярные форумы и сайты для поиска отзывов
        self.review_sites = {
            'youtube': {
                'base_url': 'https://www.youtube.com/results?search_query=',
                'keywords': ['review', 'test', 'обзор', 'тест-драйв', 'отзыв владельца']
            },
            'drive2': {
                'base_url': 'https://www.drive2.ru/search/?q=',
                'keywords': ['отзыв', 'опыт эксплуатации', 'год с автомобилем']
            },
            'reddit': {
                'base_url': 'https://www.reddit.com/search/?q=',
                'keywords': ['review', 'owner experience', 'reliability']
            }
        }
    
    def search_reviews_for_car(self, car_make: str, car_model: str, year: str = '') -> Dict:
        """Поиск отзывов для конкретного автомобиля"""
        print(f"🔍 Ищу отзывы для {car_make} {car_model} {year}")
        
        search_queries = self._generate_search_queries(car_make, car_model, year)
        all_results = {
            'found_reviews': [],
            'summary': {
                'total_found': 0,
                'youtube_reviews': 0,
                'forum_posts': 0,
                'expert_reviews': 0
            },
            'common_issues': [],
            'positive_feedback': [],
            'overall_sentiment': 'neutral'
        }
        
        # Здесь бы в реальности делались запросы к поисковым API
        # Для демонстрации создаем mock данные
        mock_reviews = self._generate_mock_reviews(car_make, car_model, year)
        all_results.update(mock_reviews)
        
        return all_results
    
    def _generate_search_queries(self, make: str, model: str, year: str) -> List[str]:
        """Генерирует поисковые запросы для разных платформ"""
        base_terms = [f"{make} {model}", f"{make} {model} {year}"] if year else [f"{make} {model}"]
        
        queries = []
        for term in base_terms:
            queries.extend([
                f"{term} review",
                f"{term} отзыв владельца",
                f"{term} problems issues",
                f"{term} надежность",
                f"{term} test drive",
                f"{term} owner experience"
            ])
        
        return queries
    
    def _generate_mock_reviews(self, make: str, model: str, year: str) -> Dict:
        """Генерирует mock данные отзывов для демонстрации"""
        # В реальности здесь были бы данные с YouTube API, Reddit API, etc.
        return {
            'found_reviews': [
                {
                    'source': 'YouTube',
                    'title': f'{make} {model} - Честный отзыв владельца после года эксплуатации',
                    'author': 'AutoReviewRU',
                    'rating': 4.2,
                    'key_points': ['Надежный двигатель', 'Дорогое обслуживание', 'Отличная управляемость'],
                    'url': 'mock_youtube_url',
                    'views': '125K'
                },
                {
                    'source': 'Drive2.ru',
                    'title': f'Мой опыт с {make} {model} - плюсы и минусы',
                    'author': 'Владелец из Москвы',
                    'rating': 3.8,
                    'key_points': ['Комфортный салон', 'Проблемы с электроникой', 'Высокий расход'],
                    'url': 'mock_drive2_url',
                    'views': '45K'
                },
                {
                    'source': 'Reddit',
                    'title': f'{make} {model} reliability discussion',
                    'author': 'r/cars community',
                    'rating': 4.0,
                    'key_points': ['Generally reliable', 'Some transmission issues', 'Great performance'],
                    'url': 'mock_reddit_url',
                    'views': '200 comments'
                }
            ],
            'summary': {
                'total_found': 3,
                'youtube_reviews': 1,
                'forum_posts': 2,
                'expert_reviews': 0
            },
            'common_issues': [
                'Дорогое обслуживание и запчасти',
                'Проблемы с электроникой после 3-4 лет',
                'Высокий расход топлива в городе'
            ],
            'positive_feedback': [
                'Отличная управляемость и динамика',
                'Качественный и комфортный интерьер',
                'Престижный бренд и высокая остаточная стоимость',
                'Надежный двигатель при правильном обслуживании'
            ],
            'overall_sentiment': 'positive'
        }

class CarAnalyzer:
    """Класс для анализа и оценки автомобилей"""
    
    def __init__(self):
        self.review_searcher = ReviewSearcher()
        
        # Критерии оценки с весами
        self.evaluation_criteria = {
            'reliability': {'weight': 0.25, 'description': 'Надежность'},
            'comfort': {'weight': 0.20, 'description': 'Комфорт'},
            'performance': {'weight': 0.20, 'description': 'Производительность'},
            'economy': {'weight': 0.15, 'description': 'Экономичность'},
            'safety': {'weight': 0.10, 'description': 'Безопасность'},
            'design': {'weight': 0.10, 'description': 'Дизайн'}
        }
        
        # База данных оценок моделей (в реальности была бы из базы)
        self.model_ratings = {
            'mercedes_gle': {
                'reliability': 3.8,
                'comfort': 4.7,
                'performance': 4.5,
                'economy': 3.2,
                'safety': 4.8,
                'design': 4.6
            },
            'bmw_3_series': {
                'reliability': 4.1,
                'comfort': 4.3,
                'performance': 4.7,
                'economy': 4.0,
                'safety': 4.5,
                'design': 4.4
            }
        }
    
    def analyze_car_from_listing(self, listing_data: Dict) -> Dict:
        """Анализирует авто на основе данных объявления"""
        if not listing_data.get('structured_data') or listing_data['structured_data'].get('type') != 'car_listing':
            return None
        
        car_data = listing_data['structured_data']
        analysis = {
            'overall_score': 0,
            'category_scores': {},
            'price_analysis': {},
            'recommendation': '',
            'pros_cons': {'pros': [], 'cons': []},
            'market_comparison': {},
            'depreciation_forecast': {}
        }
        
        # Определяем модель (упрощенно)
        model_key = self._identify_model(listing_data.get('title', '').lower())
        
        if model_key and model_key in self.model_ratings:
            ratings = self.model_ratings[model_key]
            
            # Вычисляем оценки по категориям
            total_weighted_score = 0
            for criterion, config in self.evaluation_criteria.items():
                score = ratings.get(criterion, 3.0)
                analysis['category_scores'][criterion] = {
                    'score': score,
                    'description': config['description'],
                    'weight': config['weight']
                }
                total_weighted_score += score * config['weight']
            
            analysis['overall_score'] = round(total_weighted_score, 1)
            analysis['recommendation'] = self._generate_recommendation(analysis['overall_score'])
        
        # Анализ цены
        if car_data.get('price'):
            analysis['price_analysis'] = self._analyze_price(car_data)
        
        return analysis
    
    def compare_cars(self, car1_data: Dict, car2_data: Dict) -> Dict:
        """Сравнивает два автомобиля"""
        analysis1 = self.analyze_car_from_listing(car1_data)
        analysis2 = self.analyze_car_from_listing(car2_data)
        
        if not analysis1 or not analysis2:
            return {'error': 'Не удалось проанализировать один из автомобилей'}
        
        comparison = {
            'winner': None,
            'score_difference': abs(analysis1['overall_score'] - analysis2['overall_score']),
            'category_comparison': {},
            'summary': '',
            'car1_advantages': [],
            'car2_advantages': [],
            'final_recommendation': ''
        }
        
        # Определяем победителя
        if analysis1['overall_score'] > analysis2['overall_score']:
            comparison['winner'] = 'car1'
        elif analysis2['overall_score'] > analysis1['overall_score']:
            comparison['winner'] = 'car2'
        else:
            comparison['winner'] = 'tie'
        
        # Сравниваем по категориям
        for criterion in self.evaluation_criteria.keys():
            score1 = analysis1['category_scores'][criterion]['score']
            score2 = analysis2['category_scores'][criterion]['score']
            
            comparison['category_comparison'][criterion] = {
                'car1_score': score1,
                'car2_score': score2,
                'difference': score1 - score2,
                'winner': 'car1' if score1 > score2 else 'car2' if score2 > score1 else 'tie'
            }
            
            # Определяем преимущества
            if score1 > score2 + 0.3:
                comparison['car1_advantages'].append(self.evaluation_criteria[criterion]['description'])
            elif score2 > score1 + 0.3:
                comparison['car2_advantages'].append(self.evaluation_criteria[criterion]['description'])
        
        comparison['final_recommendation'] = self._generate_final_recommendation(comparison)
        
        return comparison
    
    def _identify_model(self, title: str) -> str:
        """Определяет модель авто по заголовку"""
        if 'mercedes' in title and 'gle' in title:
            return 'mercedes_gle'
        elif 'bmw' in title and ('3' in title or 'series' in title):
            return 'bmw_3_series'
        return None
    
    def _analyze_price(self, car_data: Dict) -> Dict:
        """Анализирует цену автомобиля"""
        # Упрощенный анализ - в реальности был бы словарь рыночных цен
        price_str = car_data.get('price', '0')
        try:
            price_num = float(''.join(filter(str.isdigit, price_str)))
        except:
            price_num = 0
        
        return {
            'price_value': price_num,
            'market_position': 'average' if 100000 <= price_num <= 300000 else 'premium' if price_num > 300000 else 'budget',
            'value_rating': 3.5,  # Мок-данные
            'negotiation_potential': '5-10%'
        }
    
    def _generate_recommendation(self, score: float) -> str:
        """Генерирует рекомендацию на основе общей оценки"""
        if score >= 4.5:
            return 'Отличный выбор! Рекомендуем к покупке.'
        elif score >= 4.0:
            return 'Хороший автомобиль с небольшими недостатками.'
        elif score >= 3.5:
            return 'Средний вариант. Рассмотрите альтернативы.'
        else:
            return 'Не рекомендуем к покупке. Много недостатков.'
    
    def _generate_final_recommendation(self, comparison: Dict) -> str:
        """Генерирует финальную рекомендацию по сравнению"""
        if comparison['winner'] == 'tie':
            return 'Оба автомобиля сопоставимы по качеству. Выбор зависит от личных предпочтений.'
        elif comparison['score_difference'] < 0.3:
            return 'Незначительное преимущество. Оба варианта достойны внимания.'
        elif comparison['score_difference'] < 0.7:
            winner = 'Первый' if comparison['winner'] == 'car1' else 'Второй'
            return f'{winner} автомобиль имеет заметное преимущество.'
        else:
            winner = 'Первый' if comparison['winner'] == 'car1' else 'Второй'
            return f'{winner} автомобиль явно лучше. Отличный выбор!'

def detect_urls_in_text(text: str) -> List[str]:
    """
    Обнаруживает URL в тексте
    
    Args:
        text: Текст для анализа
        
    Returns:
        Список найденных URL
    """
    url_pattern = re.compile(
        r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        r'|(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*[a-zA-Z0-9]*\.(?:[a-zA-Z]{2,4})(?:[/?][-a-zA-Z0-9._~:/?#[@!$&\'()*+,;=]*)?'
    )
    
    urls = url_pattern.findall(text)
    
    # Добавляем https:// к URL без протокола
    normalized_urls = []
    for url in urls:
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        normalized_urls.append(url)
    
    return normalized_urls