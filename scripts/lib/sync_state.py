"""Sync state tracking and checkpoint/resume management for LicitaGym collectors.

Provides durable state recording:
- States: 'running' | 'completed' | 'failed_partial' | 'failed'
- Structured logging (stdlib logging) for start, page progress, checkpoint writes, and failures.
- Checkpoint persistence to JSON with atomic file replacement.
- Resume from checkpoint when LICITAGYM_SYNC_RESUME=1 or resume=True is passed.
- Clear error handling: mid-run failures record 'failed_partial', do not pretend success.
"""

import os
import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)

# Environment variable to enable resume mode across collectors
SYNC_RESUME_ENV = "LICITAGYM_SYNC_RESUME"
SYNC_STATE_DIR_ENV = "LICITAGYM_SYNC_STATE_DIR"

DEFAULT_STATE_DIR = Path("scripts/.sync_state")

VALID_STATUSES = {"running", "completed", "failed_partial", "failed"}


def is_sync_resume_enabled() -> bool:
    """Check if LICITAGYM_SYNC_RESUME env var is set."""
    val = os.getenv(SYNC_RESUME_ENV, "").strip().lower()
    return val in ("1", "true", "yes", "on")


def get_sync_state_dir() -> Path:
    """Return the resolved Path for sync state persistence."""
    env_dir = os.getenv(SYNC_STATE_DIR_ENV, "").strip()
    if env_dir:
        return Path(env_dir)
    return DEFAULT_STATE_DIR


@dataclass
class SyncState:
    """Represents the execution and checkpoint state of a collector run.

    Fields:
        endpoint: Identifier of the endpoint or family (e.g. '1_consultarGrupoMaterial')
        status: 'running' | 'completed' | 'failed_partial' | 'failed'
        last_page: Last successfully fetched page number (1-based, 0 if none)
        last_ok_at: ISO-8601 UTC timestamp of last successful page/checkpoint
        started_at: ISO-8601 UTC timestamp of run start
        updated_at: ISO-8601 UTC timestamp of last state update
        total_records: Cumulative count of records successfully collected so far
        error_summary: Human-readable error summary if failed or failed_partial
        error_details: Additional structured error metadata if available
        partial: Boolean flag indicating if progress was interrupted mid-run
        cursor: Optional arbitrary cursor or sub-key (e.g. item ID, date window)
        metadata: Custom arbitrary collector-specific metadata
    """
    endpoint: str
    status: str = "running"
    last_page: int = 0
    last_ok_at: Optional[str] = None
    started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    total_records: int = 0
    error_summary: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None
    partial: bool = False
    cursor: Optional[Any] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert state to serializable dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SyncState":
        """Instantiate SyncState from dictionary."""
        valid_keys = {
            "endpoint", "status", "last_page", "last_ok_at", "started_at",
            "updated_at", "total_records", "error_summary", "error_details",
            "partial", "cursor", "metadata"
        }
        filtered = {k: v for k, v in data.items() if k in valid_keys}
        return cls(**filtered)


class SyncStateManager:
    """Manages reading, updating, and saving durable SyncState for an endpoint."""

    def __init__(
        self,
        endpoint: str,
        state_dir: Optional[Union[str, Path]] = None,
        auto_create_dir: bool = True,
    ):
        self.endpoint = endpoint
        self.state_dir = Path(state_dir) if state_dir is not None else get_sync_state_dir()
        self.auto_create_dir = auto_create_dir

        # Safe filename sanitizing slashes or special chars
        safe_name = endpoint.replace("/", "_").replace("\\", "_").strip("_")
        self.state_file = self.state_dir / f"{safe_name}.json"
        self.data_file = self.state_dir / f"{safe_name}_data.json"
        self._current_state: Optional[SyncState] = None

    def get_state_file_path(self) -> Path:
        return self.state_file

    def get_data_file_path(self) -> Path:
        return self.data_file

    def save_accumulated_data(self, data: Any) -> None:
        """Persist accumulated collector records to side-car file atomically."""
        if self.auto_create_dir:
            self.state_dir.mkdir(parents=True, exist_ok=True)
        tmp_file = self.data_file.with_suffix(".tmp")
        try:
            with open(tmp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            tmp_file.replace(self.data_file)
        except Exception as e:
            logger.error(f"[SyncState:{self.endpoint}] Erro ao salvar dados acumulados em {self.data_file}: {e}")
            if tmp_file.exists():
                try:
                    tmp_file.unlink()
                except Exception:
                    pass

    def load_accumulated_data(self) -> Optional[Any]:
        """Load accumulated collector records from side-car file if it exists."""
        if not self.data_file.exists():
            return None
        try:
            with open(self.data_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"[SyncState:{self.endpoint}] Falha ao ler dados acumulados em {self.data_file}: {e}")
            return None

    def load_checkpoint(self) -> Optional[SyncState]:
        """Load existing checkpoint state from disk if present."""
        if not self.state_file.exists():
            return None
        try:
            with open(self.state_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            state = SyncState.from_dict(data)
            logger.info(
                f"[SyncState:{self.endpoint}] Checkpoint carregado: status={state.status}, "
                f"last_page={state.last_page}, total_records={state.total_records}, partial={state.partial}"
            )
            return state
        except Exception as e:
            logger.warning(
                f"[SyncState:{self.endpoint}] Falha ao ler checkpoint em {self.state_file}: {e}"
            )
            return None

    def start_run(
        self,
        resume: bool = False,
        default_cursor: Optional[Any] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SyncState:
        """Initialize or resume a collector run.

        If resume=True and a prior checkpoint exists (especially 'failed_partial' or 'running'),
        resumes from `last_page` and maintains cumulative records.
        Otherwise, starts a fresh 'running' state.
        """
        existing = self.load_checkpoint() if resume else None

        if existing is not None and existing.status in ("failed_partial", "running", "failed"):
            logger.info(
                f"[SyncState:{self.endpoint}] Retomando a partir da página {existing.last_page} "
                f"(status anterior: {existing.status}, registros: {existing.total_records})"
            )
            existing.status = "running"
            existing.updated_at = datetime.now(timezone.utc).isoformat()
            existing.error_summary = None
            existing.error_details = None
            if metadata:
                existing.metadata.update(metadata)
            self._current_state = existing
            self.save(existing)
            return existing

        now_iso = datetime.now(timezone.utc).isoformat()
        state = SyncState(
            endpoint=self.endpoint,
            status="running",
            last_page=0,
            last_ok_at=None,
            started_at=now_iso,
            updated_at=now_iso,
            total_records=0,
            partial=False,
            cursor=default_cursor,
            metadata=metadata or {},
        )
        logger.info(f"[SyncState:{self.endpoint}] Iniciando nova execução de sync.")
        self._current_state = state
        self.save(state)
        return state

    def record_page_success(
        self,
        page: int,
        records_in_page: int,
        cursor: Optional[Any] = None,
        metadata_update: Optional[Dict[str, Any]] = None,
    ) -> SyncState:
        """Record successful fetch of a page."""
        if self._current_state is None:
            self._current_state = SyncState(endpoint=self.endpoint)

        now_iso = datetime.now(timezone.utc).isoformat()
        self._current_state.last_page = page
        self._current_state.last_ok_at = now_iso
        self._current_state.updated_at = now_iso
        self._current_state.total_records += records_in_page
        self._current_state.status = "running"
        self._current_state.partial = False
        if cursor is not None:
            self._current_state.cursor = cursor
        if metadata_update:
            self._current_state.metadata.update(metadata_update)

        logger.info(
            f"[SyncState:{self.endpoint}] Checkpoint: página {page} salva (+{records_in_page} reg, "
            f"total={self._current_state.total_records})"
        )
        self.save(self._current_state)
        return self._current_state

    def record_partial_failure(
        self,
        error: Union[Exception, str],
        page: Optional[int] = None,
        error_details: Optional[Dict[str, Any]] = None,
        cursor: Optional[Any] = None,
    ) -> SyncState:
        """Record a failure mid-run. Marks state as 'failed_partial' with partial=True."""
        if self._current_state is None:
            self._current_state = SyncState(endpoint=self.endpoint)

        now_iso = datetime.now(timezone.utc).isoformat()
        self._current_state.status = "failed_partial"
        self._current_state.partial = True
        self._current_state.updated_at = now_iso
        self._current_state.error_summary = str(error)
        self._current_state.error_details = error_details or {}
        if cursor is not None:
            self._current_state.cursor = cursor

        target_page = page if page is not None else self._current_state.last_page
        logger.error(
            f"[SyncState:{self.endpoint}] Falha parcial na página {target_page}: {error}. "
            f"Última página OK: {self._current_state.last_page}. Checkpoint registrado."
        )
        self.save(self._current_state)
        return self._current_state

    def record_completed(
        self,
        total_records: Optional[int] = None,
        metadata_update: Optional[Dict[str, Any]] = None,
    ) -> SyncState:
        """Record successful completion of the collector run."""
        if self._current_state is None:
            self._current_state = SyncState(endpoint=self.endpoint)

        now_iso = datetime.now(timezone.utc).isoformat()
        self._current_state.status = "completed"
        self._current_state.partial = False
        self._current_state.updated_at = now_iso
        self._current_state.last_ok_at = now_iso
        self._current_state.error_summary = None
        self._current_state.error_details = None

        if total_records is not None:
            self._current_state.total_records = total_records
        if metadata_update:
            self._current_state.metadata.update(metadata_update)

        logger.info(
            f"[SyncState:{self.endpoint}] Concluído com sucesso: total_records={self._current_state.total_records}, "
            f"última página={self._current_state.last_page}"
        )
        self.save(self._current_state)
        return self._current_state

    def record_failed(
        self,
        error: Union[Exception, str],
        error_details: Optional[Dict[str, Any]] = None,
    ) -> SyncState:
        """Record an unrecoverable failure that prevented any progress (or terminal error)."""
        if self._current_state is None:
            self._current_state = SyncState(endpoint=self.endpoint)

        now_iso = datetime.now(timezone.utc).isoformat()
        # If any pages were collected previously, keep it as failed_partial
        if self._current_state.last_page > 0:
            self._current_state.status = "failed_partial"
            self._current_state.partial = True
        else:
            self._current_state.status = "failed"
            self._current_state.partial = False

        self._current_state.updated_at = now_iso
        self._current_state.error_summary = str(error)
        self._current_state.error_details = error_details or {}

        logger.error(
            f"[SyncState:{self.endpoint}] Falha registrada: status={self._current_state.status}, erro={error}"
        )
        self.save(self._current_state)
        return self._current_state

    def save(self, state: SyncState) -> None:
        """Persist SyncState to disk atomically."""
        if self.auto_create_dir:
            self.state_dir.mkdir(parents=True, exist_ok=True)

        data = state.to_dict()
        tmp_file = self.state_file.with_suffix(".tmp")
        try:
            with open(tmp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            tmp_file.replace(self.state_file)
        except Exception as e:
            logger.error(f"[SyncState:{self.endpoint}] Erro ao persistir estado em {self.state_file}: {e}")
            if tmp_file.exists():
                try:
                    tmp_file.unlink()
                except Exception:
                    pass

    def clear(self) -> None:
        """Delete checkpoint file if exists."""
        if self.state_file.exists():
            try:
                self.state_file.unlink()
                logger.info(f"[SyncState:{self.endpoint}] Checkpoint removido: {self.state_file}")
            except Exception as e:
                logger.warning(f"[SyncState:{self.endpoint}] Falha ao remover {self.state_file}: {e}")
        if self.data_file.exists():
            try:
                self.data_file.unlink()
                logger.info(f"[SyncState:{self.endpoint}] Dados acumulados removidos: {self.data_file}")
            except Exception as e:
                logger.warning(f"[SyncState:{self.endpoint}] Falha ao remover {self.data_file}: {e}")
        self._current_state = None
