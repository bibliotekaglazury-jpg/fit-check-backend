import firebase_admin
from firebase_admin import credentials, firestore, auth
from datetime import datetime, timedelta
import os
from typing import Dict, Optional

class UserManager:
    """Управление пользователями, токенами и подписками"""
    
    def __init__(self, firebase_config_path: str = None):
        if not firebase_admin._apps:
            if firebase_config_path and os.path.exists(firebase_config_path):
                cred = credentials.Certificate(firebase_config_path)
                firebase_admin.initialize_app(cred)
            else:
                # Используем переменные окружения для Production
                firebase_admin.initialize_app()
        
        self.db = firestore.client()
        
        # Планы подписок
        self.subscription_plans = {
            'free': {
                'name': 'Free Plan',
                'daily_tokens': 10,
                'models': ['gpt-3.5-turbo'],
                'price': 0,
                'welcome_bonus': 50  # Бонусные токены при регистрации
            },
            'pro_monthly': {
                'name': 'Pro Monthly',
                'daily_tokens': 1000,
                'models': ['gpt-3.5-turbo', 'gpt-4', 'claude-3-sonnet', 'gemini-pro'],
                'price': 19.99,
                'stripe_price_id': 'price_pro_monthly'
            },
            'pro_yearly': {
                'name': 'Pro Yearly', 
                'daily_tokens': -1,  # Безлимит
                'models': 'all',
                'price': 199.99,
                'stripe_price_id': 'price_pro_yearly'
            }
        }

    async def create_new_user(self, firebase_uid: str, email: str, display_name: str = None) -> Dict:
        """Создание нового пользователя с бесплатными токенами"""
        try:
            user_data = {
                'uid': firebase_uid,
                'email': email,
                'display_name': display_name or email.split('@')[0],
                'subscription_plan': 'free',
                'created_at': datetime.now(),
                'last_login': datetime.now(),
                
                # Бесплатные токены
                'tokens': {
                    'remaining': self.subscription_plans['free']['welcome_bonus'],  # 50 стартовых токенов
                    'used_today': 0,
                    'total_used': 0,
                    'last_reset': datetime.now().date().isoformat()
                },
                
                # Статистика
                'stats': {
                    'messages_sent': 0,
                    'favorite_model': None,
                    'total_sessions': 0
                },
                
                # Подписка
                'subscription': {
                    'plan': 'free',
                    'status': 'active',
                    'started_at': datetime.now(),
                    'expires_at': None,  # Для free плана не истекает
                    'stripe_customer_id': None,
                    'stripe_subscription_id': None
                }
            }
            
            # Сохраняем в Firestore
            self.db.collection('users').document(firebase_uid).set(user_data)
            
            return {
                'success': True,
                'user_data': user_data,
                'message': f'🎉 Добро пожаловать! У вас есть {user_data["tokens"]["remaining"]} бесплатных сообщений!'
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def check_user_tokens(self, firebase_uid: str, model_name: str) -> Dict:
        """Проверка доступности токенов для пользователя"""
        try:
            user_doc = self.db.collection('users').document(firebase_uid).get()
            if not user_doc.exists:
                return {'allowed': False, 'reason': 'User not found'}
            
            user_data = user_doc.to_dict()
            plan = user_data['subscription']['plan']
            plan_config = self.subscription_plans[plan]
            
            # Проверяем доступность модели для плана
            if plan_config['models'] != 'all' and model_name not in plan_config['models']:
                return {
                    'allowed': False, 
                    'reason': f'Модель {model_name} недоступна для плана {plan_config["name"]}',
                    'upgrade_needed': True
                }
            
            # Сброс счетчика в новый день
            today = datetime.now().date().isoformat()
            if user_data['tokens']['last_reset'] != today:
                # Новый день - сбрасываем дневной счетчик
                self.db.collection('users').document(firebase_uid).update({
                    'tokens.used_today': 0,
                    'tokens.last_reset': today
                })
                user_data['tokens']['used_today'] = 0
            
            # Проверяем лимиты
            remaining = user_data['tokens']['remaining']
            used_today = user_data['tokens']['used_today'] 
            daily_limit = plan_config['daily_tokens']
            
            if plan == 'free':
                # Для free плана - считаем общие оставшиеся токены
                if remaining <= 0:
                    return {
                        'allowed': False,
                        'reason': 'У вас закончились бесплатные сообщения',
                        'upgrade_needed': True,
                        'remaining_tokens': remaining
                    }
            else:
                # Для платных планов - дневной лимит
                if daily_limit != -1 and used_today >= daily_limit:
                    return {
                        'allowed': False,
                        'reason': f'Дневной лимит {daily_limit} сообщений исчерпан',
                        'remaining_tokens': daily_limit - used_today
                    }
            
            return {
                'allowed': True,
                'remaining_tokens': remaining if plan == 'free' else (daily_limit - used_today if daily_limit != -1 else -1),
                'plan': plan_config['name']
            }
            
        except Exception as e:
            return {'allowed': False, 'reason': f'Error: {str(e)}'}

    async def consume_token(self, firebase_uid: str, model_name: str, tokens_used: int = 1) -> bool:
        """Списание токена после использования"""
        try:
            user_ref = self.db.collection('users').document(firebase_uid)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                return False
            
            user_data = user_doc.to_dict()
            plan = user_data['subscription']['plan']
            
            updates = {
                'tokens.used_today': firestore.Increment(tokens_used),
                'tokens.total_used': firestore.Increment(tokens_used),
                'stats.messages_sent': firestore.Increment(1),
                'last_login': datetime.now()
            }
            
            # Для free плана дополнительно уменьшаем общий остаток
            if plan == 'free':
                updates['tokens.remaining'] = firestore.Increment(-tokens_used)
            
            user_ref.update(updates)
            return True
            
        except Exception as e:
            print(f"Error consuming token: {e}")
            return False

    async def upgrade_subscription(self, firebase_uid: str, new_plan: str, stripe_data: Dict = None) -> Dict:
        """Обновление подписки пользователя"""
        try:
            if new_plan not in self.subscription_plans:
                return {'success': False, 'error': 'Invalid subscription plan'}
            
            plan_config = self.subscription_plans[new_plan]
            
            updates = {
                'subscription.plan': new_plan,
                'subscription.status': 'active',
                'subscription.started_at': datetime.now(),
            }
            
            if stripe_data:
                updates.update({
                    'subscription.stripe_customer_id': stripe_data.get('customer_id'),
                    'subscription.stripe_subscription_id': stripe_data.get('subscription_id'),
                })
                
                # Для платных планов устанавливаем дату окончания
                if new_plan.endswith('yearly'):
                    expires_at = datetime.now() + timedelta(days=365)
                else:
                    expires_at = datetime.now() + timedelta(days=30)
                updates['subscription.expires_at'] = expires_at
            
            self.db.collection('users').document(firebase_uid).update(updates)
            
            return {
                'success': True,
                'message': f'Подписка обновлена до {plan_config["name"]}!',
                'plan': plan_config
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def get_user_dashboard_data(self, firebase_uid: str) -> Dict:
        """Получение данных для дашборда пользователя"""
        try:
            user_doc = self.db.collection('users').document(firebase_uid).get()
            if not user_doc.exists:
                return {'success': False, 'error': 'User not found'}
            
            user_data = user_doc.to_dict()
            plan = user_data['subscription']['plan']
            plan_config = self.subscription_plans[plan]
            
            # Вычисляем статистику
            dashboard_data = {
                'user': {
                    'email': user_data['email'],
                    'display_name': user_data['display_name'],
                    'member_since': user_data['created_at'].strftime('%B %Y')
                },
                'subscription': {
                    'plan_name': plan_config['name'],
                    'plan_id': plan,
                    'status': user_data['subscription']['status'],
                    'expires_at': user_data['subscription'].get('expires_at')
                },
                'usage': {
                    'remaining_tokens': user_data['tokens']['remaining'] if plan == 'free' else None,
                    'used_today': user_data['tokens']['used_today'],
                    'daily_limit': plan_config['daily_tokens'],
                    'total_messages': user_data['stats']['messages_sent']
                },
                'available_models': plan_config['models'],
                'upgrade_available': plan == 'free'
            }
            
            return {'success': True, 'data': dashboard_data}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}