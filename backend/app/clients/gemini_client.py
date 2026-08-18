# ==========================================================================
# Purpose: Gemini Interactions API Communication
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import logging
from abc import ABC, abstractmethod
from functools import lru_cache
from typing import Any

from google import genai
from pydantic import HttpUrl, TypeAdapter, ValidationError

from app.core.config import settings
from app.core.exceptions import ConfigurationError, GeminiError
from app.prompts.chat_prompt import (
    CHAT_SYSTEM_INSTRUCTION,
    LOCATION_SYSTEM_INSTRUCTION,
    MAPS_SYSTEM_INSTRUCTION,
    RESTAURANT_DISCOVERY_SYSTEM_INSTRUCTION,
)
from app.schemas.chat_schema import (
    ChatGeminiResponse,
    ChatLocationInterpretation,
    MapsGroundedPlace,
    MapsGroundingContext,
    MapsGroundingSource,
)
from app.schemas.restaurant import GeminiRestaurantDiscovery

# ==========================================================================
# PARAMETERS
# ==========================================================================
logger = logging.getLogger(__name__)
HTTP_URL_ADAPTER = TypeAdapter(HttpUrl)


# ==========================================================================
# Interface: IGeminiClient
# ==========================================================================
class IGeminiClient(ABC):
    @abstractmethod
    async def interpret_chat_location(
        self,
        message: str,
    ) -> ChatLocationInterpretation:
        pass

    @abstractmethod
    async def generate_maps_context(
        self,
        input_text: str,
        *,
        latitude: float,
        longitude: float,
    ) -> MapsGroundingContext:
        pass

    @abstractmethod
    async def generate_structured_chat(
        self,
        input_text: str,
    ) -> ChatGeminiResponse:
        pass

    @abstractmethod
    async def generate_structured_restaurants(
        self,
        input_text: str,
    ) -> GeminiRestaurantDiscovery:
        pass


# ==========================================================================
# Class: GeminiClient
# ==========================================================================
class GeminiClient(IGeminiClient):
    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        timeout_seconds: float,
    ) -> None:
        normalized_key = api_key.strip()
        if not normalized_key:
            raise ConfigurationError("Gemini API key is not configured")
        if timeout_seconds <= 0:
            raise ValueError("Gemini timeout must be positive")

        self.model = model
        self.timeout_seconds = timeout_seconds
        self._client = genai.Client(api_key=normalized_key)

    # ======================================================================
    # Function: Interpret an Explicit Location Mention in the User Message
    # ======================================================================
    async def interpret_chat_location(
        self,
        message: str,
    ) -> ChatLocationInterpretation:
        request: dict[str, Any] = {
            "model": self.model,
            "input": message,
            "store": False,
            "system_instruction": LOCATION_SYSTEM_INSTRUCTION,
            "response_format": {
                "type": "text",
                "mime_type": "application/json",
                "schema": ChatLocationInterpretation.model_json_schema(),
            },
            "generation_config": {
                "max_output_tokens": 256,
                "thinking_level": "low",
            },
            "timeout": self.timeout_seconds,
        }
        interaction = await self._create_interaction(
            request,
            operation="chat location interpretation",
        )

        output_text = interaction.output_text
        if not isinstance(output_text, str) or not output_text.strip():
            raise GeminiError("The location interpreter returned no response")

        try:
            return ChatLocationInterpretation.model_validate_json(output_text)
        except ValidationError as exc:
            logger.warning(
                "Gemini returned an invalid location interpretation: %d validation errors",
                exc.error_count(),
            )
            raise GeminiError(
                "The location interpreter returned an invalid response"
            ) from exc

    # ======================================================================
    # Function: Obtain Google Maps Grounding Without Structured Output
    # ======================================================================
    async def generate_maps_context(
        self,
        input_text: str,
        *,
        latitude: float,
        longitude: float,
    ) -> MapsGroundingContext:
        tools = self._build_tools(
            latitude=latitude,
            longitude=longitude,
            use_maps=True,
        )
        if not tools:
            raise GeminiError("Google Maps grounding requires valid coordinates")

        request: dict[str, Any] = {
            "model": self.model,
            "input": input_text,
            "store": False,
            "system_instruction": MAPS_SYSTEM_INSTRUCTION,
            "tools": tools,
            "generation_config": {
                "max_output_tokens": 1_024,
                "thinking_level": "low",
            },
            "timeout": self.timeout_seconds,
        }
        interaction = await self._create_interaction(
            request,
            operation="Google Maps grounding",
        )
        return self._extract_maps_context(interaction)

    # ======================================================================
    # Function: Generate and Validate the Final Structured Chat
    # ======================================================================
    async def generate_structured_chat(
        self,
        input_text: str,
    ) -> ChatGeminiResponse:
        request: dict[str, Any] = {
            "model": self.model,
            "input": input_text,
            "store": False,
            "system_instruction": CHAT_SYSTEM_INSTRUCTION,
            "response_format": {
                "type": "text",
                "mime_type": "application/json",
                "schema": ChatGeminiResponse.model_json_schema(),
            },
            "generation_config": {
                "max_output_tokens": 2_048,
                "thinking_level": "low",
            },
            "timeout": self.timeout_seconds,
        }
        interaction = await self._create_interaction(
            request,
            operation="structured chat",
        )

        output_text = interaction.output_text
        if not isinstance(output_text, str) or not output_text.strip():
            raise GeminiError("The recommendation service returned no response")

        try:
            return ChatGeminiResponse.model_validate_json(output_text)
        except ValidationError as exc:
            logger.warning(
                "Gemini returned invalid structured output: %d validation errors",
                exc.error_count(),
            )
            raise GeminiError(
                "The recommendation service returned an invalid response"
            ) from exc

    # ======================================================================
    # Function: Generate Strict JSON for Grounded Restaurant Discovery
    # ======================================================================
    async def generate_structured_restaurants(
        self,
        input_text: str,
    ) -> GeminiRestaurantDiscovery:
        request: dict[str, Any] = {
            "model": self.model,
            "input": input_text,
            "store": False,
            "system_instruction": RESTAURANT_DISCOVERY_SYSTEM_INSTRUCTION,
            "response_format": {
                "type": "text",
                "mime_type": "application/json",
                "schema": GeminiRestaurantDiscovery.model_json_schema(),
            },
            "generation_config": {
                "max_output_tokens": 2_048,
                "thinking_level": "low",
            },
            "timeout": self.timeout_seconds,
        }
        interaction = await self._create_interaction(
            request,
            operation="structured restaurant discovery",
        )

        output_text = interaction.output_text
        if not isinstance(output_text, str) or not output_text.strip():
            raise GeminiError("The restaurant discovery service returned no response")

        try:
            return GeminiRestaurantDiscovery.model_validate_json(output_text)
        except ValidationError as exc:
            logger.warning(
                "Gemini returned invalid restaurant discovery output: %d validation errors",
                exc.error_count(),
            )
            raise GeminiError(
                "The restaurant discovery service returned an invalid response"
            ) from exc

    # ======================================================================
    # Function: Build Optional Google Maps Grounding Tool
    # ======================================================================
    @staticmethod
    def _build_tools(
        *,
        latitude: float | None,
        longitude: float | None,
        use_maps: bool,
    ) -> list[dict[str, float | str]]:
        if not use_maps:
            return []
        if latitude is None or longitude is None:
            return []
        if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
            return []
        return [
            {
                "type": "google_maps",
                "latitude": latitude,
                "longitude": longitude,
            }
        ]

    # ======================================================================
    # Function: Execute a Gemini Interaction with Safe Error Mapping
    # ======================================================================
    async def _create_interaction(
        self,
        request: dict[str, Any],
        *,
        operation: str,
    ) -> Any:
        try:
            interaction = await self._client.aio.interactions.create(**request)
        except Exception as exc:
            status_code = self._safe_http_status(exc)
            logger.warning(
                "Gemini %s request failed: type=%s status=%s",
                operation,
                type(exc).__name__,
                status_code,
            )
            if status_code == 404:
                raise ConfigurationError(
                    "The configured Gemini model is unavailable"
                ) from exc
            raise GeminiError("The recommendation service is unavailable") from exc

        if interaction.status != "completed" or interaction.errors:
            logger.warning(
                "Gemini %s did not complete successfully: status=%s",
                operation,
                interaction.status,
            )
            raise GeminiError("The recommendation service did not complete")
        return interaction

    # ======================================================================
    # Function: Read a Safe SDK HTTP Status for Diagnostics
    # ======================================================================
    @staticmethod
    def _safe_http_status(error: Exception) -> int | None:
        response = getattr(error, "raw_response", None) or getattr(
            error,
            "response",
            None,
        )
        status_code = getattr(response, "status_code", None)
        return status_code if isinstance(status_code, int) else None

    # ======================================================================
    # Function: Extract Maps Places and Attribution Metadata
    # ======================================================================
    @classmethod
    def _extract_maps_context(cls, interaction: Any) -> MapsGroundingContext:
        grounded_text = interaction.output_text
        if not isinstance(grounded_text, str):
            grounded_text = ""

        places: list[MapsGroundedPlace] = []
        sources: list[MapsGroundingSource] = []
        widget_tokens: list[str] = []
        signatures: list[str] = []

        for step in interaction.steps or []:
            if getattr(step, "type", None) != "google_maps_result":
                continue

            signature = cls._clean_text(getattr(step, "signature", None), 4_000)
            if signature:
                signatures.append(signature)

            for result in getattr(step, "result", None) or []:
                widget_token = cls._clean_text(
                    getattr(result, "widget_context_token", None),
                    4_000,
                )
                if widget_token:
                    widget_tokens.append(widget_token)

                for place in getattr(result, "places", None) or []:
                    name = cls._clean_text(getattr(place, "name", None), 200)
                    place_id = cls._clean_text(
                        getattr(place, "place_id", None),
                        255,
                    )
                    place_uri = cls._safe_http_url(getattr(place, "url", None))
                    if name or place_id or place_uri:
                        places.append(
                            MapsGroundedPlace(
                                name=name,
                                google_place_id=place_id,
                                google_maps_uri=place_uri,
                            )
                        )
                        sources.append(
                            MapsGroundingSource(
                                title=name,
                                uri=place_uri,
                                google_place_id=place_id,
                            )
                        )

                    for review in getattr(place, "review_snippets", None) or []:
                        review_uri = cls._safe_http_url(getattr(review, "url", None))
                        review_id = cls._clean_text(
                            getattr(review, "review_id", None),
                            255,
                        )
                        review_title = cls._clean_text(
                            getattr(review, "title", None),
                            300,
                        )
                        if review_uri or review_id or review_title:
                            sources.append(
                                MapsGroundingSource(
                                    title=review_title,
                                    uri=review_uri,
                                    google_place_id=place_id,
                                    review_id=review_id,
                                )
                            )

        context = MapsGroundingContext(
            grounded_text=grounded_text.strip()[:8_000],
            places=cls._deduplicate(places, limit=20),
            sources=cls._deduplicate(sources, limit=50),
            widget_context_tokens=list(dict.fromkeys(widget_tokens))[:10],
            grounding_signatures=list(dict.fromkeys(signatures))[:10],
        )
        if not context.grounded_text and not context.places:
            raise GeminiError("Google Maps grounding returned no useful data")
        return context

    # ======================================================================
    # Function: Normalize Optional SDK Text
    # ======================================================================
    @staticmethod
    def _clean_text(value: Any, max_length: int) -> str | None:
        if not isinstance(value, str):
            return None
        normalized = value.strip()
        return normalized[:max_length] or None

    # ======================================================================
    # Function: Retain Only Valid HTTP(S) Attribution URLs
    # ======================================================================
    @staticmethod
    def _safe_http_url(value: Any) -> str | None:
        if not isinstance(value, str):
            return None
        try:
            return str(HTTP_URL_ADAPTER.validate_python(value))
        except ValidationError:
            return None

    # ======================================================================
    # Function: Deduplicate Pydantic Metadata Models
    # ======================================================================
    @staticmethod
    def _deduplicate[T](items: list[T], *, limit: int) -> list[T]:
        unique: list[T] = []
        seen: set[str] = set()
        for item in items:
            key = repr(item)
            if key in seen:
                continue
            seen.add(key)
            unique.append(item)
            if len(unique) == limit:
                break
        return unique


# ==========================================================================
# Function: Create and Reuse the Configured GeminiClient
# ==========================================================================
@lru_cache(maxsize=1)
def get_gemini_client() -> GeminiClient:
    if settings.gemini_api_key is None:
        raise ConfigurationError("Gemini API key is not configured")

    return GeminiClient(
        api_key=settings.gemini_api_key.get_secret_value(),
        model=settings.gemini_model,
        timeout_seconds=settings.gemini_timeout_seconds,
    )
