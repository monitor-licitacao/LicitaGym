"""LicitaGym scripts library."""

from scripts.lib.http_client import (
    HttpClient,
    HttpFetchError,
    LEGACY_EMPTY_ON_ERROR_ENV,
    COMPRAS_GOV_PAGE_SIZE,
    clamp_compras_gov_page_size,
    parse_retry_after,
)
from scripts.lib.http_fetch import fetch_json

__all__ = [
    "HttpClient",
    "HttpFetchError",
    "LEGACY_EMPTY_ON_ERROR_ENV",
    "COMPRAS_GOV_PAGE_SIZE",
    "clamp_compras_gov_page_size",
    "parse_retry_after",
    "fetch_json",
]
