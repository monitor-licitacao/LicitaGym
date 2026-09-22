"""LicitaGym scripts library."""

from scripts.lib.http_client import (
    HttpClient,
    HttpFetchError,
    LEGACY_EMPTY_ON_ERROR_ENV,
    ALLOWED_HOSTS_ENV,
    DEFAULT_ALLOWED_HOSTS,
    COMPRAS_GOV_PAGE_SIZE,
    clamp_compras_gov_page_size,
    parse_retry_after,
)
from scripts.lib.http_fetch import fetch_json
from scripts.lib.sync_state import (
    SyncState,
    SyncStateManager,
    SYNC_RESUME_ENV,
    SYNC_STATE_DIR_ENV,
    is_sync_resume_enabled,
    get_sync_state_dir,
)

__all__ = [
    "HttpClient",
    "HttpFetchError",
    "LEGACY_EMPTY_ON_ERROR_ENV",
    "ALLOWED_HOSTS_ENV",
    "DEFAULT_ALLOWED_HOSTS",
    "COMPRAS_GOV_PAGE_SIZE",
    "clamp_compras_gov_page_size",
    "parse_retry_after",
    "fetch_json",
    "SyncState",
    "SyncStateManager",
    "SYNC_RESUME_ENV",
    "SYNC_STATE_DIR_ENV",
    "is_sync_resume_enabled",
    "get_sync_state_dir",
]
