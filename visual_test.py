#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Демонстрационный скрипт для тестирования улучшенного визуального отображения 
рейтингов, сравнений и фотогалерей в нашей системе анализа автомобилей.

Показывает как выглядят новые красивые рамки и элементы интерфейса.
"""

def demo_car_analysis():
    """Демо профессионального анализа автомобиля"""
    print("=" * 70)
    print("🚀 ДЕМОНСТРАЦИЯ УЛУЧШЕННОГО ВИЗУАЛЬНОГО ОТОБРАЖЕНИЯ")
    print("=" * 70)
    
    # Демо анализа одного автомобиля
    print("\n┌" + "─" * 50 + "┐")
    print("│" + " " * 8 + "🏆 ПРОФЕССИОНАЛЬНЫЙ АНАЛИЗ" + " " * 7 + "│")
    print("├" + "─" * 50 + "┤")
    
    # Общая оценка
    stars_full = "⭐" * 4
    stars_empty = "☆" * 1
    print(f"│ 🎆 ОБЩАЯ ОЦЕНКА: {stars_full}{stars_empty} 4.2/5.0" + " " * 9 + "│")
    
    # Рекомендация
    recommendation = "Отличный выбор для семейного использования"
    print(f"│ 📝 {recommendation}" + " " * (48 - len(recommendation)) + "│")
    print("└" + "─" * 50 + "┘")
    
    # Детальные оценки
    print("\n📉 ДЕТАЛЬНЫЕ ОЦЕНКИ:")
    
    categories = [
        ("reliability", "⚙️", "Надежность", 4.5),
        ("comfort", "🛋️", "Комфорт", 4.0),
        ("performance", "🏎️", "Производительность", 3.8),
        ("economy", "💰", "Экономичность", 4.2)
    ]
    
    for category, icon, name, score in categories:
        stars = "⭐" * int(score) + "☆" * (5 - int(score))
        progress_bars = "█" * int(score) + "░" * (5 - int(score))
        print(f"{icon} **{name}**: {stars} [{progress_bars}] {score}/5.0")

def demo_car_comparison():
    """Демо сравнения двух автомобилей"""
    print("\n\n" + "=" * 70)
    print("🆚 ДЕМО СРАВНЕНИЯ АВТОМОБИЛЕЙ")
    print("=" * 70)
    
    # Красивая двойная рамка для сравнения
    print("\n╔" + "═" * 60 + "╗")
    print("║" + " " * 15 + "🏆 ПРОФЕССИОНАЛЬНОЕ СРАВНЕНИЕ АВТО" + " " * 15 + "║")
    print("╠" + "═" * 60 + "╣")
    
    # Победитель
    winner_text = "🥇 ПОБЕДИТЕЛЬ: Первый автомобиль"
    print(f"║ {winner_text}" + " " * (59 - len(winner_text)) + "║")
    print(f"║ 📊 Разница в оценках: 0.8 балла" + " " * 25 + "║")
    print("╠" + "═" * 60 + "╣")
    
    # Детальное сравнение
    print("║" + " " * 20 + "📈 ДЕТАЛЬНОЕ СРАВНЕНИЕ" + " " * 19 + "║")
    print("║" + "-" * 60 + "║")
    
    comparison_data = [
        ("⚙️", "Надежность", 4.5, 3.8, "🟢"),
        ("🛋️", "Комфорт", 4.2, 4.0, "🟢"),
        ("🏎️", "Производительность", 3.5, 4.2, "🔴"),
        ("💰", "Экономичность", 4.0, 3.7, "🟢")
    ]
    
    for icon, name, score1, score2, winner_icon in comparison_data:
        car1_bars = "█" * int(score1) + "░" * (5 - int(score1))
        car2_bars = "█" * int(score2) + "░" * (5 - int(score2))
        
        print(f"║ {icon} {name}:" + " " * (25 - len(name)) + f"{winner_icon}" + " " * 22 + "║")
        print(f"║    Авто 1: [{car1_bars}] {score1}" + " " * 23 + "║")
        print(f"║    Авто 2: [{car2_bars}] {score2}" + " " * 23 + "║")
        print("║" + " " * 60 + "║")
    
    # Итоговая рекомендация
    print("╠" + "═" * 60 + "╣")
    print("║" + " " * 18 + "💡 ИТОГОВАЯ РЕКОМЕНДАЦИЯ" + " " * 18 + "║")
    print("║" + "-" * 60 + "║")
    
    recommendation = "Первый автомобиль показывает лучшие показатели по"
    print(f"║ {recommendation}" + " " * (59 - len(recommendation)) + "║")
    recommendation2 = "надежности и экономичности. Рекомендуем к покупке!"
    print(f"║ {recommendation2}" + " " * (59 - len(recommendation2)) + "║")
    
    print("╚" + "═" * 60 + "╝")

def demo_reviews():
    """Демо отзывов владельцев"""
    print("\n\n" + "=" * 70)
    print("💬 ДЕМО ОТЗЫВОВ ВЛАДЕЛЬЦЕВ")
    print("=" * 70)
    
    # Красивая рамка для отзывов
    print("\n┌" + "─" * 55 + "┐")
    print("│" + " " * 15 + "📝 ОТЗЫВЫ ВЛАДЕЛЬЦЕВ" + " " * 15 + "│")
    print("├" + "─" * 55 + "┤")
    print(f"│ 📈 Найдено отзывов: 47" + " " * 33 + "│")
    print("└" + "─" * 55 + "┘")
    
    # Отзывы в красивом оформлении
    reviews = [
        {
            'source': 'YouTube',
            'title': 'Отзыв владельца BMW X5',
            'rating': 4,
            'author': 'Алексей М.',
            'key_points': ['Надежная машина', 'Комфортная подвеска']
        },
        {
            'source': 'Drive2.ru',
            'title': 'Год с BMW X5 - впечатления',
            'rating': 5,
            'author': 'Михаил К.',
            'key_points': ['Отличная управляемость', 'Премиум интерьер']
        }
    ]
    
    for idx, review in enumerate(reviews, 1):
        rating_stars = "⭐" * review['rating'] + "☆" * (5 - review['rating'])
        print(f"\n┌── Отзыв #{idx} " + "─" * 20 + "┐")
        print(f"│ 📦 Источник: {review['source']}" + " " * (28 - len(review['source'])) + "│")
        
        title = review['title']
        if len(title) > 30:
            title = title[:27] + "..."
        print(f"│ 📝 {title}" + " " * (31 - len(title)) + "│")
        print(f"│ {rating_stars} ({review['rating']}/5.0) - {review['author']}" + " " * (30 - len(review['author']) - len(str(review['rating']))) + "│")
        print("├" + "─" * 32 + "┤")
        
        for point in review['key_points']:
            if len(point) > 30:
                point = point[:27] + "..."
            print(f"│ • {point}" + " " * (30 - len(point)) + "│")
        print("└" + "─" * 32 + "┘")

def demo_photo_gallery():
    """Демо фотогалереи автомобиля"""
    print("\n\n" + "=" * 70)
    print("📷 ДЕМО ФОТОГАЛЕРЕИ")
    print("=" * 70)
    
    # Красивая рамка для фотогалереи
    print("\n┌" + "─" * 52 + "┐")
    print("│" + " " * 8 + "📷 ФОТОГАЛЕРЕЯ (6 фото)" + " " * 15 + "│")
    print("├" + "─" * 52 + "┤")
    
    images = [
        {'title': 'Общий вид', 'url': 'https://example.com/car1.jpg'},
        {'title': 'Интерьер', 'url': 'https://example.com/interior.jpg'},
        {'title': 'Двигатель', 'url': 'https://very-long-domain-name.com/engine.jpg'}
    ]
    
    for i, img in enumerate(images, 1):
        # Обрезаем URL если он слишком длинный
        url_display = img['url']
        if len(url_display) > 42:
            url_display = url_display[:39] + "..."
        
        title_display = img['title']
        if len(title_display) > 20:
            title_display = title_display[:17] + "..."
            
        print(f"│ 🎆 [{i}] {title_display}" + " " * (48 - len(title_display)) + "│")
        print(f"│    🔗 {url_display}" + " " * (48 - len(url_display)) + "│")
        if i < len(images):
            print("│" + "-" * 52 + "│")
    
    print("└" + "─" * 52 + "┘")

if __name__ == "__main__":
    print("🎨 ДЕМОНСТРАЦИЯ УЛУЧШЕННЫХ ВИЗУАЛЬНЫХ ЭЛЕМЕНТОВ")
    print("=" * 70)
    print("Этот скрипт показывает как выглядят новые красивые рамки,")
    print("рейтинги, сравнения и фотогалереи в нашей системе.")
    print("=" * 70)
    
    demo_car_analysis()
    demo_car_comparison()  
    demo_reviews()
    demo_photo_gallery()
    
    print("\n\n🎉 ДЕМОНСТРАЦИЯ ЗАВЕРШЕНА!")
    print("✨ Все визуальные элементы теперь имеют красивое оформление с рамками,")
    print("   иконками, прогресс-барами и структурированной подачей информации!")