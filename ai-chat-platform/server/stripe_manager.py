import stripe
import os
from flask import request, jsonify
from typing import Dict, Optional
from .user_manager import UserManager

class StripeManager:
    """Управление платежами через Stripe"""
    
    def __init__(self, stripe_secret_key: str = None):
        stripe.api_key = stripe_secret_key or os.getenv('STRIPE_SECRET_KEY')
        self.webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
        self.user_manager = UserManager()
        
        # ID продуктов в Stripe (нужно создать в Stripe Dashboard)
        self.stripe_prices = {
            'pro_monthly': os.getenv('STRIPE_PRICE_PRO_MONTHLY'),  # price_xxx
            'pro_yearly': os.getenv('STRIPE_PRICE_PRO_YEARLY')     # price_xxx
        }

    async def create_checkout_session(self, firebase_uid: str, plan: str, success_url: str, cancel_url: str) -> Dict:
        """Создание Stripe Checkout сессии для оплаты подписки"""
        try:
            if plan not in self.stripe_prices:
                return {'success': False, 'error': 'Invalid plan'}
            
            # Получаем данные пользователя
            user_doc = self.user_manager.db.collection('users').document(firebase_uid).get()
            if not user_doc.exists:
                return {'success': False, 'error': 'User not found'}
            
            user_data = user_doc.to_dict()
            email = user_data['email']
            
            # Создаем или получаем Stripe customer
            customers = stripe.Customer.list(email=email, limit=1)
            if customers.data:
                customer = customers.data[0]
            else:
                customer = stripe.Customer.create(
                    email=email,
                    metadata={
                        'firebase_uid': firebase_uid,
                        'display_name': user_data.get('display_name', '')
                    }
                )
            
            # Сохраняем customer_id в Firebase
            self.user_manager.db.collection('users').document(firebase_uid).update({
                'subscription.stripe_customer_id': customer.id
            })
            
            # Создаем checkout сессию
            session = stripe.checkout.Session.create(
                customer=customer.id,
                payment_method_types=['card'],
                line_items=[{
                    'price': self.stripe_prices[plan],
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=success_url + '?session_id={CHECKOUT_SESSION_ID}',
                cancel_url=cancel_url,
                metadata={
                    'firebase_uid': firebase_uid,
                    'plan': plan
                },
                subscription_data={
                    'metadata': {
                        'firebase_uid': firebase_uid,
                        'plan': plan
                    }
                }
            )
            
            return {
                'success': True,
                'checkout_url': session.url,
                'session_id': session.id
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def handle_webhook(self, payload: str, sig_header: str) -> Dict:
        """Обработка Stripe webhooks для автоматической активации подписок"""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
            
            if event['type'] == 'checkout.session.completed':
                session = event['data']['object']
                await self._handle_successful_payment(session)
                
            elif event['type'] == 'invoice.payment_succeeded':
                invoice = event['data']['object']
                await self._handle_subscription_renewal(invoice)
                
            elif event['type'] == 'customer.subscription.deleted':
                subscription = event['data']['object']
                await self._handle_subscription_cancellation(subscription)
            
            return {'success': True}
            
        except ValueError as e:
            return {'success': False, 'error': f'Invalid payload: {e}'}
        except stripe.error.SignatureVerificationError as e:
            return {'success': False, 'error': f'Invalid signature: {e}'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def _handle_successful_payment(self, session):
        """Обработка успешного платежа"""
        firebase_uid = session['metadata']['firebase_uid']
        plan = session['metadata']['plan']
        
        # Получаем подписку Stripe
        subscription_id = session['subscription']
        subscription = stripe.Subscription.retrieve(subscription_id)
        
        # Обновляем пользователя в Firebase
        await self.user_manager.upgrade_subscription(
            firebase_uid=firebase_uid,
            new_plan=plan,
            stripe_data={
                'customer_id': session['customer'],
                'subscription_id': subscription_id
            }
        )
        
        print(f"✅ Subscription activated for user {firebase_uid}, plan: {plan}")

    async def _handle_subscription_renewal(self, invoice):
        """Обработка продления подписки"""
        customer_id = invoice['customer']
        
        # Находим пользователя по customer_id
        users = self.user_manager.db.collection('users').where(
            'subscription.stripe_customer_id', '==', customer_id
        ).limit(1).get()
        
        if users:
            user_doc = users[0]
            firebase_uid = user_doc.id
            
            # Обновляем дату окончания подписки
            subscription = stripe.Subscription.retrieve(invoice['subscription'])
            plan = subscription['metadata'].get('plan', 'pro_monthly')
            
            from datetime import datetime, timedelta
            if plan.endswith('yearly'):
                new_expires_at = datetime.now() + timedelta(days=365)
            else:
                new_expires_at = datetime.now() + timedelta(days=30)
            
            self.user_manager.db.collection('users').document(firebase_uid).update({
                'subscription.expires_at': new_expires_at,
                'subscription.status': 'active'
            })
            
            print(f"✅ Subscription renewed for user {firebase_uid}")

    async def _handle_subscription_cancellation(self, subscription):
        """Обработка отмены подписки"""
        customer_id = subscription['customer']
        
        # Находим пользователя
        users = self.user_manager.db.collection('users').where(
            'subscription.stripe_customer_id', '==', customer_id
        ).limit(1).get()
        
        if users:
            user_doc = users[0]
            firebase_uid = user_doc.id
            
            # Переводим на free план
            await self.user_manager.upgrade_subscription(
                firebase_uid=firebase_uid,
                new_plan='free'
            )
            
            self.user_manager.db.collection('users').document(firebase_uid).update({
                'subscription.status': 'cancelled'
            })
            
            print(f"❌ Subscription cancelled for user {firebase_uid}")

    async def get_customer_portal_url(self, firebase_uid: str, return_url: str) -> Dict:
        """Создание ссылки на портал управления подпиской"""
        try:
            user_doc = self.user_manager.db.collection('users').document(firebase_uid).get()
            if not user_doc.exists:
                return {'success': False, 'error': 'User not found'}
            
            user_data = user_doc.to_dict()
            customer_id = user_data['subscription'].get('stripe_customer_id')
            
            if not customer_id:
                return {'success': False, 'error': 'No Stripe customer found'}
            
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url,
            )
            
            return {
                'success': True,
                'portal_url': session.url
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_pricing_info(self) -> Dict:
        """Получение информации о ценах для отображения на сайте"""
        return {
            'plans': [
                {
                    'id': 'free',
                    'name': '🆓 Free Plan',
                    'price': 0,
                    'period': '',
                    'features': [
                        '50 стартовых сообщений',
                        '10 сообщений в день',
                        'Доступ к GPT-3.5',
                        'Базовый интерфейс'
                    ],
                    'button_text': 'Текущий план',
                    'popular': False
                },
                {
                    'id': 'pro_monthly',
                    'name': '🚀 Pro Monthly',
                    'price': 19.99,
                    'period': '/месяц',
                    'features': [
                        '1000 сообщений в день',
                        'Все AI модели (GPT-4, Claude, Gemini)',
                        'Приоритетная поддержка',
                        'Экспорт чатов',
                        'Голосовой ввод'
                    ],
                    'button_text': 'Выбрать план',
                    'popular': True
                },
                {
                    'id': 'pro_yearly',
                    'name': '💎 Pro Yearly',
                    'price': 199.99,
                    'period': '/год',
                    'original_price': 239.88,
                    'save_text': 'Экономия $40',
                    'features': [
                        'Безлимитные сообщения',
                        'Все AI модели',
                        'API доступ',
                        'Приоритетная поддержка',
                        'Кастомные интеграции'
                    ],
                    'button_text': 'Лучшее предложение',
                    'popular': False
                }
            ]
        }