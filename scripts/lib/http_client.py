"""Unified Python HTTP Client for LicitaGym.

Features:
- Configurable retry logic aligned in spirit with Edge `withRetry`:
  - 429 rate limits respect `Retry-After` (seconds or RFC 2822 / RFC 7231 HTTP-date),
    falling back to exponential backoff with configurable base/cap.
  - Limited retries for transient 5xx codes (default: 502, 503, 504).
  - Configurable maximum retries and timeouts.
- Robust timeout and transport classification:
  - Normalizes `urllib.error.URLError(socket.timeout)` and `TimeoutError` into
    `error_type='timeout'`.
  - Normalizes connection/DNS errors into `error_type='transport'`.
  - Normalizes HTTP error codes into `error_type='http_status'`.
- Pagination / page-size helper aligned with Edge `COMPRAS_GOV_PAGE_SIZE`.
- Rollback escape hatch via `LICITAGYM_LEGACY_EMPTY_ON_ERROR`.
"""

import os
import json
import time
import socket
import logging
import urllib.request
import urllib.error
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple, Union

logger = logging.getLogger(__name__)

LEGACY_EMPTY_ON_ERROR_ENV = "LICITAGYM_LEGACY_EMPTY_ON_ERROR"

# Aligned with Edge clampComprasGovPageSize (10 to 500, default 500)
COMPRAS_GOV_PAGE_SIZE = {
    "min": 10,
    "max": 500,
    "default": 500,
}

DEFAULT_TRANSIENT_STATUS_CODES: Set[int] = {502, 503, 504}


def clamp_compras_gov_page_size(page_size: Optional[int] = None) -> int:
    """Clamp page size to Compras.gov allowed bounds (10-500, default 500)."""
    min_size = COMPRAS_GOV_PAGE_SIZE["min"]
    max_size = COMPRAS_GOV_PAGE_SIZE["max"]
    default_size = COMPRAS_GOV_PAGE_SIZE["default"]

    size = default_size if page_size is None else page_size
    return max(min_size, min(size, max_size))


class HttpFetchError(IOError):
    """Raised when an HTTP or transport error occurs."""

    def __init__(
        self,
        message: str,
        url: str,
        status_code: Optional[int] = None,
        original_error: Optional[Exception] = None,
        attempts: int = 1,
        error_type: Optional[str] = None,
    ):
        super().__init__(message)
        self.url = url
        self.status_code = status_code
        self.original_error = original_error
        self.attempts = attempts
        self.error_type = error_type or ("http_status" if status_code else "transport")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sucesso": False,
            "erro": str(self),
            "error_type": self.error_type,
            "status_code": self.status_code,
            "url": self.url,
            "tentativas": self.attempts,
        }


def is_legacy_empty_on_error_enabled() -> bool:
    """Check if rollback flag is set."""
    val = os.getenv(LEGACY_EMPTY_ON_ERROR_ENV, "").strip().lower()
    return val in ("1", "true", "yes", "on")


def parse_retry_after(header_value: Optional[str], default_wait: float = 2.0, max_cap: float = 60.0) -> float:
    """Parse Retry-After header which can be delta-seconds or HTTP-date.

    Returns the number of seconds to wait (clamped to max_cap).
    """
    if not header_value or not header_value.strip():
        return default_wait

    header_clean = header_value.strip()

    # 1. Try integer / float seconds
    try:
        val = float(header_clean)
        return max(0.0, min(val, max_cap))
    except ValueError:
        pass

    # 2. Try HTTP-date (RFC 2822 / RFC 7231, e.g. 'Wed, 21 Oct 2026 07:28:00 GMT')
    try:
        dt = parsedate_to_datetime(header_clean)
        now = datetime.now(timezone.utc)
        if dt.tzinfo is None:
            # Assume UTC if naive
            dt = dt.replace(tzinfo=timezone.utc)
        delta = (dt - now).total_seconds()
        return max(0.0, min(delta, max_cap))
    except Exception as e:
        logger.debug(f"Falha ao interpretar header Retry-After '{header_value}': {e}")
        return default_wait


def classify_exception(exc: Exception) -> Tuple[str, Optional[int]]:
    """Classify an exception into error_type ('timeout', 'transport', 'http_status', 'json_parse')

    Returns:
        (error_type, status_code)
    """
    if isinstance(exc, urllib.error.HTTPError):
        return ("http_status", exc.code)

    if isinstance(exc, TimeoutError) or isinstance(exc, socket.timeout):
        return ("timeout", None)

    if isinstance(exc, urllib.error.URLError):
        # Check if the inner reason is a timeout
        reason = getattr(exc, "reason", None)
        if isinstance(reason, (socket.timeout, TimeoutError)):
            return ("timeout", None)
        if isinstance(reason, str) and "timed out" in reason.lower():
            return ("timeout", None)
        return ("transport", None)

    if isinstance(exc, json.JSONDecodeError):
        return ("json_parse", None)

    return ("transport", None)


class HttpClient:
    """Configurable HTTP client for LicitaGym collectors.

    Features:
    - Automatic Retry-After parsing on 429
    - Transient retry for 502/503/504
    - Timeout classification
    - Safe legacy envelope handling on rollback
    """

    def __init__(
        self,
        timeout: int = 30,
        max_retries: int = 3,
        backoff_factor: float = 2.0,
        max_backoff: float = 60.0,
        user_agent: str = "LicitaGym/Collector",
        transient_status_codes: Optional[Set[int]] = None,
    ):
        self.timeout = timeout
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self.max_backoff = max_backoff
        self.user_agent = user_agent
        self.transient_status_codes = (
            set(transient_status_codes)
            if transient_status_codes is not None
            else set(DEFAULT_TRANSIENT_STATUS_CODES)
        )

    def fetch_json(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[int] = None,
        max_retries: Optional[int] = None,
        backoff_factor: Optional[float] = None,
        raise_for_status: bool = True,
        legacy_empty_envelope_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Fetch JSON with retry on 429 & transient 5xx, respecting Retry-After."""
        effective_timeout = timeout if timeout is not None else self.timeout
        effective_max_retries = max_retries if max_retries is not None else self.max_retries
        effective_backoff = backoff_factor if backoff_factor is not None else self.backoff_factor

        req_headers = {"User-Agent": self.user_agent, "Accept": "application/json"}
        if headers:
            req_headers.update(headers)

        last_error: Optional[Exception] = None
        last_status: Optional[int] = None
        last_error_type: Optional[str] = None
        attempt = 0

        while attempt < effective_max_retries:
            attempt += 1
            try:
                req = urllib.request.Request(url, headers=req_headers)
                with urllib.request.urlopen(req, timeout=effective_timeout) as resp:
                    raw = resp.read().decode("utf-8")
                    if not raw.strip():
                        return {}
                    return json.loads(raw)

            except Exception as e:
                last_error = e
                error_type, status_code = classify_exception(e)
                last_error_type = error_type
                last_status = status_code

                is_retryable = False
                wait_time = 0.0

                if error_type == "http_status" and status_code is not None:
                    if status_code == 429:
                        # 429 Rate Limit: check Retry-After header
                        is_retryable = attempt < effective_max_retries
                        retry_after_hdr = None
                        if hasattr(e, "headers") and e.headers:
                            retry_after_hdr = e.headers.get("Retry-After")

                        default_wait = min(self.max_backoff, effective_backoff ** attempt)
                        wait_time = parse_retry_after(retry_after_hdr, default_wait=default_wait, max_cap=self.max_backoff)
                        logger.warning(
                            f"Rate-limit (429) em {url}. Tentativa {attempt}/{effective_max_retries}. "
                            f"Aguardando {wait_time}s (Retry-After: {retry_after_hdr})..."
                        )
                    elif status_code in self.transient_status_codes:
                        # Transient 5xx error (502, 503, 504)
                        is_retryable = attempt < effective_max_retries
                        retry_after_hdr = None
                        if hasattr(e, "headers") and e.headers:
                            retry_after_hdr = e.headers.get("Retry-After")

                        default_wait = min(self.max_backoff, effective_backoff ** attempt)
                        wait_time = parse_retry_after(retry_after_hdr, default_wait=default_wait, max_cap=self.max_backoff)
                        logger.warning(
                            f"Erro transiente HTTP {status_code} em {url}. Tentativa {attempt}/{effective_max_retries}. "
                            f"Aguardando {wait_time}s..."
                        )
                    else:
                        logger.error(f"Erro HTTP {status_code} ao acessar {url}: {e}")

                elif error_type == "timeout":
                    logger.error(f"Timeout ({effective_timeout}s) ao acessar {url}: {e}")
                elif error_type == "transport":
                    logger.error(f"Erro de transporte (URLError) ao acessar {url}: {e}")
                else:
                    logger.error(f"Erro ao processar resposta de {url}: {e}")

                if is_retryable:
                    time.sleep(wait_time)
                    continue
                else:
                    break

        # If legacy rollback flag is explicitly enabled, return empty list envelope
        if is_legacy_empty_on_error_enabled() and legacy_empty_envelope_key:
            logger.warning(
                f"LICITAGYM_LEGACY_EMPTY_ON_ERROR ativo: retornando {{{legacy_empty_envelope_key}: []}} para falha em {url}"
            )
            return {legacy_empty_envelope_key: []}

        # Build informative error message
        if last_error_type == "timeout":
            err_msg = f"Timeout ({effective_timeout}s) na requisição para {url} após {attempt} tentativa(s)"
        else:
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
            error_type=last_error_type,
        )

        if raise_for_status:
            raise http_err

        return http_err.to_dict()
