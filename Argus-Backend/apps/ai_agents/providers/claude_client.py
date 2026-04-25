import json
import time
from typing import Dict, Any
from anthropic import Anthropic
from django.conf import settings
import requests
import logging

logger = logging.getLogger(__name__)

# Prompt version constant
PROMPT_VERSION = "v1.0.0"

# Model configuration
DEFAULT_MODEL = "claude-3-5-sonnet-20241022"
DEFAULT_TIMEOUT = 60
MAX_RETRIES = 3


class ClaudeClient:
    """Wrapper for Claude API with retry, timeout, and structured output parsing"""
    
    def __init__(self):
        self.provider = getattr(settings, 'AI_PROVIDER', 'anthropic').lower()
        if self.provider == 'nvidia':
            self.api_key = getattr(settings, 'NVIDIA_API_KEY', None)
            if not self.api_key:
                raise ValueError("NVIDIA_API_KEY not configured in settings")
            self.base_url = getattr(settings, 'AI_BASE_URL', 'https://integrate.api.nvidia.com/v1').rstrip('/')
            self.client = None
        else:
            api_key = getattr(settings, 'ANTHROPIC_API_KEY', None)
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY not configured in settings")
            self.client = Anthropic(api_key=api_key)
            self.api_key = api_key
            self.base_url = None
        self.model = getattr(settings, 'AI_MODEL', DEFAULT_MODEL)
        self.timeout = getattr(settings, 'AI_TIMEOUT', DEFAULT_TIMEOUT)
    
    def generate_structured_output(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        """
        Generate structured JSON output from Claude with retry logic
        """
        
        for attempt in range(MAX_RETRIES):
            try:
                if self.provider == 'nvidia':
                    content = self._generate_via_nvidia(system_prompt, user_prompt, max_tokens, temperature)
                else:
                    response = self.client.messages.create(
                        model=self.model,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        system=system_prompt,
                        messages=[
                            {"role": "user", "content": user_prompt}
                        ],
                        timeout=self.timeout
                    )
                    
                    # Extract text content
                    content = response.content[0].text
                
                # Parse JSON
                try:
                    result = json.loads(content)
                    return result
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse JSON from Claude: {e}")
                    # Try to extract JSON from markdown code blocks
                    if "```json" in content:
                        json_start = content.find("```json") + 7
                        json_end = content.find("```", json_start)
                        content = content[json_start:json_end].strip()
                        result = json.loads(content)
                        return result
                    raise
                    
            except Exception as e:
                logger.warning(f"Claude API attempt {attempt + 1} failed: {e}")
                if attempt == MAX_RETRIES - 1:
                    raise
                time.sleep(2 ** attempt)  # Exponential backoff
        
        raise Exception("Max retries exceeded for Claude API")

    def _generate_via_nvidia(self, system_prompt: str, user_prompt: str, max_tokens: int, temperature: float) -> str:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        response = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
        response.raise_for_status()
        data = response.json()
        choices = data.get("choices") or []
        if not choices:
            raise ValueError("NVIDIA API returned no choices")
        message = choices[0].get("message") or {}
        content = message.get("content")
        if not content:
            raise ValueError("NVIDIA API returned empty content")
        return content
    
    def get_model_version(self) -> str:
        return self.model
    
    def get_prompt_version(self) -> str:
        return PROMPT_VERSION
