# ==========================================================================
# Purpose: Set Up Secure Application Logging
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import json
import logging
import re
import sys
import time
from contextvars import ContextVar, Token
from datetime import UTC, datetime
from logging.config import dictConfig
from typing import Any

from app.core.config import settings
from app.core.constants import DEFAULT_LOG_FORMAT, REDACTED_VALUE


# ==========================================================================
# PARAMETERS
# ==========================================================================
request_id_context: ContextVar[str] = ContextVar("request_id", default="-")

_BEARER_PATTERN = re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._~+/-]+=*")
_JWT_PATTERN = re.compile(
    r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b"
)
_SECRET_ASSIGNMENT_PATTERN = re.compile(
    r"(?i)\b(api[_-]?key|authorization|password|secret|token)"
    r"(\s*[:=]\s*)([^\s,;]+)"
)


# ==========================================================================
# CLASSES / DATA STRUCTURE: Sensitive Data Filter
# ==========================================================================
class SensitiveDataFilter(logging.Filter):
    def __init__(self, secrets: tuple[str, ...] = ()) -> None:
        super().__init__()
        self._secrets = tuple(
            sorted((secret for secret in secrets if secret), key=len, reverse=True)
        )

    def redact(self, value: str) -> str:
        redacted = _BEARER_PATTERN.sub(f"Bearer {REDACTED_VALUE}", value)
        redacted = _JWT_PATTERN.sub(REDACTED_VALUE, redacted)
        redacted = _SECRET_ASSIGNMENT_PATTERN.sub(
            lambda match: f"{match.group(1)}{match.group(2)}{REDACTED_VALUE}",
            redacted,
        )
        for secret in self._secrets:
            redacted = redacted.replace(secret, REDACTED_VALUE)
        return redacted

    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = self.redact(record.getMessage())
        record.args = ()
        if not hasattr(record, "request_id"):
            record.request_id = request_id_context.get()
        return True


# ==========================================================================
# CLASSES / DATA STRUCTURE: Redacting Formatter
# ==========================================================================
class RedactingFormatter(logging.Formatter):
    converter = time.gmtime

    def __init__(
        self,
        fmt: str | None = None,
        secrets: tuple[str, ...] = (),
    ) -> None:
        super().__init__(fmt=fmt)
        self._redactor = SensitiveDataFilter(secrets)

    def formatException(self, exc_info: Any) -> str:
        formatted = super().formatException(exc_info)
        return self._redactor.redact(formatted)


# ==========================================================================
# CLASSES / DATA STRUCTURE: JSON Formatter
# ==========================================================================
class JsonFormatter(RedactingFormatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(
                timespec="milliseconds"
            ),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", request_id_context.get()),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


# ==========================================================================
# CORE LOGIC & FUNCTIONS
# ==========================================================================
def _configured_secrets() -> tuple[str, ...]:
    optional_secrets = (
        settings.gemini_api_key,
        settings.google_places_api_key,
        settings.revenuecat_api_key,
        settings.revenuecat_webhook_secret,
    )
    values = [settings.supabase_secret_key.get_secret_value()]
    values.extend(
        secret.get_secret_value() for secret in optional_secrets if secret is not None
    )
    return tuple(values)


def set_request_id(request_id: str) -> Token[str]:
    return request_id_context.set(request_id)


def reset_request_id(token: Token[str]) -> None:
    request_id_context.reset(token)


def setup_logging(
    level: str | int | None = None,
    *,
    json_logs: bool | None = None,
) -> None:
    configured_level = level or settings.log_level
    use_json = settings.log_json if json_logs is None else json_logs
    configured_secrets = _configured_secrets()

    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "filters": {
                "sensitive_data": {
                    "()": SensitiveDataFilter,
                    "secrets": configured_secrets,
                }
            },
            "formatters": {
                "standard": {
                    "()": RedactingFormatter,
                    "fmt": DEFAULT_LOG_FORMAT,
                    "secrets": configured_secrets,
                },
                "json": {
                    "()": JsonFormatter,
                    "secrets": configured_secrets,
                },
            },
            "handlers": {
                "default": {
                    "class": "logging.StreamHandler",
                    "stream": "ext://sys.stdout",
                    "level": configured_level,
                    "formatter": "json" if use_json else "standard",
                    "filters": ["sensitive_data"],
                }
            },
            "root": {"handlers": ["default"], "level": configured_level},
            "loggers": {
                "uvicorn": {
                    "handlers": ["default"],
                    "level": configured_level,
                    "propagate": False,
                },
                "uvicorn.access": {
                    "handlers": ["default"],
                    "level": configured_level,
                    "propagate": False,
                },
                "uvicorn.error": {
                    "handlers": ["default"],
                    "level": configured_level,
                    "propagate": False,
                },
            },
        }
    )

    logging.captureWarnings(True)


# ==========================================================================
# MAIN EXECUTION ENTRYPOINT
# ==========================================================================
if sys.version_info < (3, 12):
    raise RuntimeError("Nomue requires Python 3.12 or newer")
