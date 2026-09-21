"""Shared HTTP fetch helper for LicitaGym Python collectors.

Enforces HTTP P0 rule: errors (transport, timeout, 4xx, 5xx, 429-exhausted)
MUST NEVER be masked as empty lists/envelopes (e.g. {"resultado": []} or {"data": []}).
"""

import os
import json
import time
import logging
import urllib.request
import urllib.error
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)

# Environment variable to allow legacy fallback if needed for rollback/compat:
# LICITAGYM_LEGACY_EMPTY_ON_ERROR=1
LEGACY_EMPTY_ON_ERROR_ENV = "LICITAGYM_LEGACY_EMPTY_ON_ERROR"


class HttpFetchError(IOError):
    """Raised when an HTTP or transport error occurs during fetch_json."""

    def __init__(
        self,
        message: str,
        url: str,
        status_code: Optional[int] = None,
        original_error: Optional[Exception] = None,
        attempts: int = 1,
    ):
        super().__init__(message)
        self.url = url
        self.status_code = status_code
        self.original_error = original_error
        self.attempts = attempts

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sucesso": False,
            "erro": str(self),
            "status_code": self.status_code,
            "url": self.url,
            "tentativas": self.attempts,
        }


def is_legacy_empty_on_error_enabled() -> bool:
    """Check if rollback flag is set."""
    val = os.getenv(LEGACY_EMPTY_ON_ERROR_ENV, "").strip().lower()
    return val in ("1", "true", "yes", "on")


def fetch_json(
    url: str,
    headers: Optional[Dict[str, str]] = None,
    timeout: int = 30,
    max_retries: int = 1,
    backoff_factor: float = 2.0,
    user_agent: str = "LicitaGym/Collector",
    raise_for_status: bool = True,
    legacy_empty_envelope_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Fetch JSON from URL with retry on 429 and explicit error handling.

    Parameters:
        url: Full URL with query params.
        headers: Optional HTTP headers dictionary.
        timeout: Request timeout in seconds.
        max_retries: Maximum number of attempts (especially for 429 rate limit).
        backoff_factor: Multiplier for exponential backoff on 429.
        user_agent: Default User-Agent header if not provided in headers.
        raise_for_status: If True, raises HttpFetchError on failure.
                          If False, returns structured dict:
                          {"sucesso": False, "erro": str(e), "status_code": ...}
        legacy_empty_envelope_key: If legacy rollback env var is set,
                          returns {legacy_empty_envelope_key: []} instead of raising.

    Returns:
        Parsed JSON dict on success (includes 'sucesso': True if structured envelope is used),
        or structured error dict if raise_for_status=False.

    Raises:
        HttpFetchError: If request fails and raise_for_status=True and legacy mode is disabled.
    """
    req_headers = {"User-Agent": user_agent, "Accept": "application/json"}
    if headers:
        req_headers.update(headers)

    last_error: Optional[Exception] = None
    last_status: Optional[int] = None
    attempt = 0

    while attempt < max_retries:
        attempt += 1
        try:
            req = urllib.request.Request(url, headers=req_headers)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                status = resp.status if hasattr(resp, "status") else 200
                raw = resp.read().decode("utf-8")
                if not raw.strip():
                    return {}
                data = json.loads(raw)
                return data

        except urllib.error.HTTPError as e:
            last_error = e
            last_status = e.code
            if e.code == 429 and attempt < max_retries:
                wait_time = backoff_factor ** attempt
                logger.warning(
                    f"Rate-limit (429) em {url}. Tentativa {attempt}/{max_retries}. Aguardando {wait_time}s..."
                )
                time.sleep(wait_time)
                continue
            logger.error(f"Erro HTTP {e.code} ao acessar {url}: {e}")
            break

        except urllib.error.URLError as e:
            last_error = e
            last_status = None
            logger.error(f"Erro de transporte (URLError) ao acessar {url}: {e}")
            break

        except TimeoutError as e:
            last_error = e
            last_status = None
            logger.error(f"Timeout ({timeout}s) ao acessar {url}: {e}")
            break

        except Exception as e:
            last_error = e
            last_status = None
            logger.error(f"Erro inesperado ao acessar {url}: {e}")
            break

    # If legacy rollback flag is explicitly enabled, return empty list envelope
    if is_legacy_empty_on_error_enabled() and legacy_empty_envelope_key:
        logger.warning(
            f"LICITAGYM_LEGACY_EMPTY_ON_ERROR ativo: retornando {{{legacy_empty_envelope_key}: []}} para falha em {url}"
        )
        return {legacy_empty_envelope_key: []}

    err_msg = f"Falha na requisição para {url} após {attempt} tentativa(s)"
    if last_status:
        err_msg += f" (HTTP {last_status})"
    if last_error:
        err_msg += f": {last_error}"

    http_err = HttpFetchError(
        message=err_msg,
        url=url,
        status_code=last_status,
        original_error=last_error,
        attempts=attempt,
    )

    if raise_for_status:
        raise http_err

    return http_err.to_dict()
