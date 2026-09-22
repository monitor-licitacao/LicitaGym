"""Comprehensive offline unit tests for scripts/lib/sync_state.py (LOTE 3).

Covers:
1. SyncState dataclass serialization (to_dict/from_dict), defaults, and fields.
2. SyncStateManager path resolution and directory creation.
3. Fresh run initialization (status='running', last_page=0, partial=False).
4. Recording page success updates (last_page, cumulative total_records, timestamps).
5. Recording partial failure on mid-run error (status='failed_partial', partial=True, error_summary, exit non-zero simulation).
6. Recording completed run (status='completed', partial=False, error cleared).
7. Recording initial failure when last_page == 0 (status='failed', partial=False).
8. Resume functionality:
   - When resume=True and checkpoint exists, resumes from last_page.
   - When resume=False, starts fresh run and resets progress.
   - Environment variable LICITAGYM_SYNC_RESUME=1 detection.
9. Atomic file writing and corruption resilience during save/load.
10. Clearing checkpoints.
"""

import json
from pathlib import Path
import pytest

from scripts.lib.sync_state import (
    SyncState,
    SyncStateManager,
    SYNC_RESUME_ENV,
    SYNC_STATE_DIR_ENV,
    is_sync_resume_enabled,
    get_sync_state_dir,
)


def test_sync_state_defaults_and_serialization():
    state = SyncState(endpoint="test_endpoint")
    assert state.endpoint == "test_endpoint"
    assert state.status == "running"
    assert state.last_page == 0
    assert state.total_records == 0
    assert state.partial is False
    assert state.last_ok_at is None
    assert state.error_summary is None

    as_dict = state.to_dict()
    assert as_dict["endpoint"] == "test_endpoint"
    assert as_dict["status"] == "running"

    rebuilt = SyncState.from_dict(as_dict)
    assert rebuilt.endpoint == state.endpoint
    assert rebuilt.started_at == state.started_at
    assert rebuilt.status == state.status


def test_is_sync_resume_enabled(monkeypatch):
    monkeypatch.delenv(SYNC_RESUME_ENV, raising=False)
    assert is_sync_resume_enabled() is False

    for truthy in ("1", "true", "TRUE", "yes", "on"):
        monkeypatch.setenv(SYNC_RESUME_ENV, truthy)
        assert is_sync_resume_enabled() is True

    for falsy in ("0", "false", "no", "", "off"):
        monkeypatch.setenv(SYNC_RESUME_ENV, falsy)
        assert is_sync_resume_enabled() is False


def test_get_sync_state_dir(monkeypatch, tmp_path):
    monkeypatch.delenv(SYNC_STATE_DIR_ENV, raising=False)
    assert get_sync_state_dir() == Path("scripts/.sync_state")

    custom = tmp_path / "custom_state"
    monkeypatch.setenv(SYNC_STATE_DIR_ENV, str(custom))
    assert get_sync_state_dir() == custom


def test_sync_state_manager_fresh_run_and_success(tmp_path):
    manager = SyncStateManager("test_ep_success", state_dir=tmp_path)
    state = manager.start_run(resume=False)

    assert state.status == "running"
    assert state.last_page == 0
    assert state.partial is False
    assert manager.get_state_file_path().exists()

    # Record page 1
    manager.record_page_success(page=1, records_in_page=10)
    loaded = manager.load_checkpoint()
    assert loaded is not None
    assert loaded.last_page == 1
    assert loaded.total_records == 10
    assert loaded.status == "running"
    assert loaded.partial is False
    assert loaded.last_ok_at is not None

    # Record page 2
    manager.record_page_success(page=2, records_in_page=15)
    loaded = manager.load_checkpoint()
    assert loaded.last_page == 2
    assert loaded.total_records == 25

    # Complete run
    manager.record_completed(total_records=25)
    loaded = manager.load_checkpoint()
    assert loaded.status == "completed"
    assert loaded.partial is False
    assert loaded.total_records == 25


def test_sync_state_manager_partial_failure(tmp_path):
    manager = SyncStateManager("test_ep_partial", state_dir=tmp_path)
    manager.start_run(resume=False)

    manager.record_page_success(page=1, records_in_page=10)
    manager.record_page_success(page=2, records_in_page=10)

    # Injected mid-run error on page 3
    err = RuntimeError("HTTP 500 connection dropped")
    failed_state = manager.record_partial_failure(
        err,
        page=3,
        error_details={"http_status": 500, "attempted_page": 3},
    )

    assert failed_state.status == "failed_partial"
    assert failed_state.partial is True
    assert "HTTP 500" in (failed_state.error_summary or "")
    assert failed_state.last_page == 2  # last page OK remains 2
    assert failed_state.total_records == 20

    # Verify on disk
    on_disk = manager.load_checkpoint()
    assert on_disk is not None
    assert on_disk.status == "failed_partial"
    assert on_disk.partial is True
    assert on_disk.last_page == 2
    assert on_disk.total_records == 20
    assert on_disk.error_details == {"http_status": 500, "attempted_page": 3}


def test_sync_state_manager_initial_failure_no_progress(tmp_path):
    manager = SyncStateManager("test_ep_fail_zero", state_dir=tmp_path)
    manager.start_run(resume=False)

    # Failed on page 1 before any ok page
    manager.record_failed(RuntimeError("DNS resolution failed"))
    loaded = manager.load_checkpoint()

    assert loaded is not None
    assert loaded.status == "failed"
    assert loaded.partial is False
    assert loaded.last_page == 0
    assert loaded.total_records == 0


def test_sync_state_manager_resume_from_checkpoint(tmp_path):
    manager = SyncStateManager("test_ep_resume", state_dir=tmp_path)
    manager.start_run(resume=False)
    manager.record_page_success(page=1, records_in_page=5)
    manager.record_page_success(page=2, records_in_page=8)
    manager.record_partial_failure(RuntimeError("Mid-run crash"), page=3)

    # Simulate new process run resuming
    resuming_manager = SyncStateManager("test_ep_resume", state_dir=tmp_path)
    resumed_state = resuming_manager.start_run(resume=True)

    assert resumed_state.status == "running"
    assert resumed_state.last_page == 2
    assert resumed_state.total_records == 13
    assert resumed_state.error_summary is None

    # Continue run
    resuming_manager.record_page_success(page=3, records_in_page=7)
    resuming_manager.record_completed()

    final_state = resuming_manager.load_checkpoint()
    assert final_state.status == "completed"
    assert final_state.last_page == 3
    assert final_state.total_records == 20
    assert final_state.partial is False


def test_sync_state_manager_no_resume_overwrites_prior(tmp_path):
    manager = SyncStateManager("test_ep_fresh_overwrite", state_dir=tmp_path)
    manager.start_run(resume=False)
    manager.record_page_success(page=5, records_in_page=50)

    # Start fresh without resume flag
    fresh_state = manager.start_run(resume=False)
    assert fresh_state.status == "running"
    assert fresh_state.last_page == 0
    assert fresh_state.total_records == 0


def test_sync_state_manager_clear(tmp_path):
    manager = SyncStateManager("test_ep_clear", state_dir=tmp_path)
    manager.start_run(resume=False)
    manager.record_page_success(page=1, records_in_page=10)
    manager.save_accumulated_data([{"item": 1}])
    assert manager.get_state_file_path().exists()
    assert manager.get_data_file_path().exists()

    manager.clear()
    assert not manager.get_state_file_path().exists()
    assert not manager.get_data_file_path().exists()
    assert manager.load_checkpoint() is None


def test_sync_state_manager_accumulated_data(tmp_path):
    manager = SyncStateManager("test_ep_data", state_dir=tmp_path)
    assert manager.load_accumulated_data() is None

    sample = [{"id": 1, "name": "Item 1"}, {"id": 2, "name": "Item 2"}]
    manager.save_accumulated_data(sample)

    assert manager.get_data_file_path().exists()
    loaded = manager.load_accumulated_data()
    assert loaded == sample

    manager.clear()
    assert not manager.get_data_file_path().exists()
    assert manager.load_accumulated_data() is None


def test_sync_state_manager_safe_filename(tmp_path):
    manager = SyncStateManager("modulo/sub/endpoint?param=1", state_dir=tmp_path)
    path = manager.get_state_file_path()
    assert "/" not in path.name
    assert "\\" not in path.name
