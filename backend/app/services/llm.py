"""Optional LLM access, chosen by env vars (LLM_PROVIDER=anthropic). Off by default.

The AI only gives a first-pass check to help the junior improve. It never approves work, never
sends work to the client and never ranks people: the Anchor decides every time.

Data note: Anthropic's commercial API terms say inputs and outputs are not used to train models
by default; confirm your account's retention settings before a real launch.
"""

import json

from app.config import settings


class AnthropicLLM:
    def __init__(self) -> None:
        import anthropic

        s = settings()
        self._client = anthropic.Anthropic(api_key=s.llm_api_key) if s.llm_api_key else anthropic.Anthropic()
        self._model = s.llm_model
        self._timeout = s.llm_timeout_s

    def json(self, system: str, user: str, schema: dict) -> dict:
        response = self._client.with_options(timeout=self._timeout, max_retries=0).messages.create(
            model=self._model,
            max_tokens=3000,
            system=system,
            messages=[{"role": "user", "content": user}],
            output_config={"effort": "low", "format": {"type": "json_schema", "schema": schema}},
        )
        if response.stop_reason == "refusal":
            raise ValueError("model declined")
        text = next(b.text for b in response.content if b.type == "text")
        return json.loads(text)


def get_llm() -> AnthropicLLM | None:
    return AnthropicLLM() if settings().llm_provider == "anthropic" else None
