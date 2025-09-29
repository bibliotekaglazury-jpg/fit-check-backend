import openai
import anthropic
import requests
import json
from typing import Dict, List, Generator, Optional
from abc import ABC, abstractmethod
import os
import asyncio

class BaseAIProvider(ABC):
    """Базовый класс для всех AI провайдеров"""
    
    @abstractmethod
    def get_available_models(self) -> List[Dict]:
        """Получить список доступных моделей"""
        pass
    
    @abstractmethod
    async def chat_completion(self, messages: List[Dict], model: str, stream: bool = True, **kwargs) -> Generator:
        """Генерация ответа с поддержкой стриминга"""
        pass
    
    @abstractmethod
    def validate_api_key(self, api_key: str) -> bool:
        """Проверка валидности API ключа"""
        pass

class OpenAIProvider(BaseAIProvider):
    """Провайдер для OpenAI (ChatGPT)"""
    
    def __init__(self, api_key: str = None, base_url: str = None):
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self.base_url = base_url or 'https://api.openai.com/v1'
        self.client = openai.OpenAI(api_key=self.api_key, base_url=self.base_url)
    
    def get_available_models(self) -> List[Dict]:
        return [
            {
                'id': 'gpt-4o',
                'name': 'GPT-4o',
                'provider': 'openai',
                'context_length': 128000,
                'cost_per_1k_tokens': 0.005,
                'description': 'Наиболее продвинутая модель OpenAI'
            },
            {
                'id': 'gpt-4',
                'name': 'GPT-4',
                'provider': 'openai', 
                'context_length': 8192,
                'cost_per_1k_tokens': 0.03,
                'description': 'Мощная модель для сложных задач'
            },
            {
                'id': 'gpt-3.5-turbo',
                'name': 'GPT-3.5 Turbo',
                'provider': 'openai',
                'context_length': 4096,
                'cost_per_1k_tokens': 0.0015,
                'description': 'Быстрая и доступная модель'
            }
        ]
    
    async def chat_completion(self, messages: List[Dict], model: str, stream: bool = True, **kwargs) -> Generator:
        """Генерация ответа от OpenAI"""
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                stream=stream,
                **kwargs
            )
            
            if stream:
                for chunk in response:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            else:
                yield response.choices[0].message.content
                
        except Exception as e:
            yield f"Ошибка OpenAI: {str(e)}"
    
    def validate_api_key(self, api_key: str) -> bool:
        try:
            client = openai.OpenAI(api_key=api_key)
            client.models.list()
            return True
        except:
            return False

class ClaudeProvider(BaseAIProvider):
    """Провайдер для Anthropic Claude"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('ANTHROPIC_API_KEY')
        self.client = anthropic.Anthropic(api_key=self.api_key) if self.api_key else None
    
    def get_available_models(self) -> List[Dict]:
        return [
            {
                'id': 'claude-3-5-sonnet-20241022',
                'name': 'Claude 3.5 Sonnet',
                'provider': 'anthropic',
                'context_length': 200000,
                'cost_per_1k_tokens': 0.003,
                'description': 'Самая умная модель Claude'
            },
            {
                'id': 'claude-3-haiku-20240307',
                'name': 'Claude 3 Haiku',
                'provider': 'anthropic',
                'context_length': 200000,
                'cost_per_1k_tokens': 0.0008,
                'description': 'Быстрая модель Claude для простых задач'
            }
        ]
    
    def _convert_messages_format(self, messages: List[Dict]) -> List[Dict]:
        """Конвертация формата сообщений для Claude"""
        claude_messages = []
        system_message = None
        
        for msg in messages:
            if msg['role'] == 'system':
                system_message = msg['content']
            else:
                claude_messages.append({
                    'role': msg['role'],
                    'content': msg['content']
                })
        
        return claude_messages, system_message
    
    async def chat_completion(self, messages: List[Dict], model: str, stream: bool = True, **kwargs) -> Generator:
        """Генерация ответа от Claude"""
        if not self.client:
            yield "Ошибка: API ключ Anthropic не настроен"
            return
            
        try:
            claude_messages, system_message = self._convert_messages_format(messages)
            
            params = {
                'model': model,
                'messages': claude_messages,
                'max_tokens': kwargs.get('max_tokens', 4096),
                'stream': stream
            }
            
            if system_message:
                params['system'] = system_message
            
            response = self.client.messages.create(**params)
            
            if stream:
                for chunk in response:
                    if chunk.type == "content_block_delta":
                        yield chunk.delta.text
            else:
                yield response.content[0].text
                
        except Exception as e:
            yield f"Ошибка Claude: {str(e)}"
    
    def validate_api_key(self, api_key: str) -> bool:
        try:
            client = anthropic.Anthropic(api_key=api_key)
            # Пробуем отправить тестовый запрос
            client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}]
            )
            return True
        except:
            return False

class GeminiProvider(BaseAIProvider):
    """Провайдер для Google Gemini"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('GOOGLE_API_KEY')
        self.base_url = 'https://generativelanguage.googleapis.com/v1beta'
    
    def get_available_models(self) -> List[Dict]:
        return [
            {
                'id': 'gemini-2.0-flash',
                'name': 'Gemini 2.0 Flash',
                'provider': 'google',
                'context_length': 1048576,
                'cost_per_1k_tokens': 0.002,
                'description': 'Latest Gemini 2.0 Flash model'
            },
            {
                'id': 'gemini-2.5-flash',
                'name': 'Gemini 2.5 Flash',
                'provider': 'google',
                'context_length': 1048576,
                'cost_per_1k_tokens': 0.002,
                'description': 'Latest Gemini 2.5 Flash model'
            },
            {
                'id': 'gemini-flash-latest',
                'name': 'Gemini Flash Latest',
                'provider': 'google',
                'context_length': 1048576,
                'cost_per_1k_tokens': 0.002,
                'description': 'Latest release of Gemini Flash'
            },
            {
                'id': 'gemini-pro-latest',
                'name': 'Gemini Pro Latest',
                'provider': 'google',
                'context_length': 1048576,
                'cost_per_1k_tokens': 0.002,
                'description': 'Latest release of Gemini Pro'
            }
        ]
    
    def _convert_messages_format(self, messages: List[Dict]) -> Dict:
        """Конвертация формата сообщений для Gemini"""
        contents = []
        
        for msg in messages:
            if msg['role'] == 'system':
                # Gemini использует system instruction отдельно
                continue
            
            role = 'user' if msg['role'] == 'user' else 'model'
            contents.append({
                'role': role,
                'parts': [{'text': msg['content']}]
            })
        
        return {'contents': contents}
    
    async def chat_completion(self, messages: List[Dict], model: str, stream: bool = True, **kwargs) -> Generator:
        """Генерация ответа от Gemini"""
        if not self.api_key:
            yield "Ошибка: API ключ Google не настроен"
            return
            
        try:
            payload = self._convert_messages_format(messages)
            
            url = f"{self.base_url}/models/{model}:generateContent"
            
            headers = {
                'Content-Type': 'application/json',
            }
            
            params = {'key': self.api_key}
            
            response = requests.post(url, headers=headers, params=params, json=payload)
            
            if response.status_code == 200:
                result = response.json()
                if 'candidates' in result and result['candidates']:
                    content = result['candidates'][0]['content']['parts'][0]['text']
                    yield content
                else:
                    yield "Не удалось получить ответ от Gemini"
            else:
                yield f"Ошибка Gemini: {response.status_code} - {response.text}"
                
        except Exception as e:
            yield f"Ошибка Gemini: {str(e)}"
    
    def validate_api_key(self, api_key: str) -> bool:
        try:
            url = f"{self.base_url}/models/gemini-flash-latest:generateContent"
            headers = {'Content-Type': 'application/json'}
            params = {'key': api_key}
            payload = {
                'contents': [{
                    'role': 'user',
                    'parts': [{'text': 'Hi'}]
                }]
            }
            
            response = requests.post(url, headers=headers, params=params, json=payload)
            return response.status_code == 200
        except:
            return False

class AIProviderManager:
    """Менеджер для управления всеми AI провайдерами"""
    
    def __init__(self):
        self.providers = {
            'google': GeminiProvider()
        }
    
    def get_all_models(self) -> List[Dict]:
        """Получить все доступные модели от всех провайдеров"""
        all_models = []
        for provider_name, provider in self.providers.items():
            models = provider.get_available_models()
            all_models.extend(models)
        return all_models
    
    def get_provider_for_model(self, model_id: str) -> Optional[BaseAIProvider]:
        """Получить провайдера для конкретной модели"""
        for provider in self.providers.values():
            models = provider.get_available_models()
            for model in models:
                if model['id'] == model_id:
                    return provider
        return None
    
    async def generate_response(self, model_id: str, messages: List[Dict], stream: bool = True, **kwargs) -> Generator:
        """Генерация ответа через соответствующего провайдера"""
        provider = self.get_provider_for_model(model_id)
        if not provider:
            yield f"Модель {model_id} не найдена"
            return
        
        async for chunk in provider.chat_completion(messages, model_id, stream, **kwargs):
            yield chunk