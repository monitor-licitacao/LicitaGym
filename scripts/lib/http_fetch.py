"""Shared HTTP fetch helper for LicitaGym Python collectors.

Enforces HTTP P0 rule: errors (transport, timeout, 4xx, 5xx, 429-exhausted)
MUST NEVER be masked as empty lists/envelopes (e.g. {"resultado": []} or {"data": []}).

Backed by `scripts.lib.http_client.HttpClient`.
"""

import os
import logging
from typing import Any, Dict, Iterable, Optional, Set

from scripts.lib.http_client import (
    HttpClient,
    HttpFetchError,
    LEGACY_EMPTY_ON_ERROR_ENV,
    ALLOWED_HOSTS_ENV,
    DEFAULT_ALLOWED_HOSTS,
    COMPRAS_GOV_PAGE_SIZE,
    DEFAULT_TRANSIENT_STATUS_CODES,
    is_legacy_empty_on_error_enabled,
    clamp_compras_gov_page_size,
    parse_retry_after,
    classify_exception,
    is_host_allowed,
    validate_url,
)

logger = logging.getLogger(__name__)

__all__ = [
    "HttpClient",
    "HttpFetchError",
    "LEGACY_EMPTY_ON_ERROR_ENV",
    "ALLOWED_HOSTS_ENV",
    "DEFAULT_ALLOWED_HOSTS",
    "COMPRAS_GOV_PAGE_SIZE",
    "DEFAULT_TRANSIENT_STATUS_CODES",
    "is_legacy_empty_on_error_enabled",
    "clamp_compras_gov_page_size",
    "parse_retry_after",
    "classify_exception",
    "is_host_allowed",
    "validate_url",
    "fetch_json",
]


def fetch_json(
    url: str,
    headers: Optional[Dict[str, str]] = None,
    timeout: int = 30,
    max_retries: int = 1,
    backoff_factor: float = 2.0,
    user_agent: str = "LicitaGym/Collector",
    raise_for_status: bool = True,
    legacy_empty_envelope_key: Optional[str] = None,
    transient_status_codes: Optional[Set[int]] = None,
    allowed_hosts: Optional[Iterable[str]] = None,
) -> Dict[str, Any]:
    """Fetch JSON from URL with retry on 429 & transient 5xx, respecting Retry-After and SSRF allowlist.

    Parameters:
        url: Full URL with query params.
        headers: Optional HTTP headers dictionary.
        timeout: Request timeout in seconds.
        max_retries: Maximum number of attempts (for 429 rate limit and transient 5xx).
        backoff_factor: Multiplier for exponential backoff.
        user_agent: Default User-Agent header if not provided in headers.
        raise_for_status: If True, raises HttpFetchError on failure.
                          If False, returns structured dict:
                          {"sucesso": False, "erro": str(e), "status_code": ...}
        legacy_empty_envelope_key: If legacy rollback env var is set,
                          returns {legacy_empty_envelope_key: []} instead of raising.
        transient_status_codes: HTTP status codes to consider transient (default: 502, 503, 504).
        allowed_hosts: Allowed hostnames/domains for SSRF protection (overrides default).

    Returns:
        Parsed JSON dict on success, or structured error dict if raise_for_status=False.

    Raises:
        HttpFetchError: If request fails and raise_for_status=True and legacy mode is disabled.
    """
    client = HttpClient(
        timeout=timeout,
        max_retries=max_retries,
        backoff_factor=backoff_factor,
        user_agent=user_agent,
        transient_status_codes=transient_status_codes,
        allowed_hosts=allowed_hosts,
    )
    return client.fetch_json(
        url=url,
        headers=headers,
        timeout=timeout,
        max_retries=max_retries,
        backoff_factor=backoff_factor,
        raise_for_status=raise_for_status,
        legacy_empty_envelope_key=legacy_empty_envelope_key,
        allowed_hosts=allowed_hosts,
    )
