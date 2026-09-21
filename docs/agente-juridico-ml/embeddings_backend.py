"""
Backends de embedding para o Agente Juridico LicitaGym.

Hot path: SentenceTransformers (PyTorch), ONNX ORT CUDA, ou TensorRT EP.
Nsight DL Designer NAO e runtime — so lab de profiling.
"""

from __future__ import annotations

import json
import os
import site
from pathlib import Path
from typing import Any, Dict, List, Optional, Protocol, runtime_checkable

import numpy as np
from loguru import logger


DEFAULT_EMBEDDING_MODEL = os.getenv(
    "LICITAGYM_EMBEDDING_MODEL",
    "pierreguillou/bert-base-cased-squad-v1.1-portuguese",
)


def ensure_ort_gpu_dll_path() -> List[str]:
    """Prepend nvidia CUDA/cuDNN + TensorRT DLL dirs to PATH (Windows)."""
    added: List[str] = []

    def _add(p: Path) -> None:
        if not p.exists():
            return
        s = str(p.resolve())
        cur = os.environ.get("PATH", "")
        if s.lower() in cur.lower().split(os.pathsep):
            return
        os.environ["PATH"] = s + os.pathsep + cur
        added.append(s)

    for sp in map(Path, site.getsitepackages()):
        _add(sp / "tensorrt_libs")
        nvidia = sp / "nvidia"
        if nvidia.exists():
            for d in list(nvidia.rglob("bin")) + list(nvidia.rglob("lib")):
                if d.is_dir():
                    _add(d)
    return added


@runtime_checkable
class EmbeddingBackend(Protocol):
    model_name: str
    normalize: bool

    def load(self) -> None: ...

    def encode(self, texts: List[str]) -> np.ndarray: ...

    @property
    def dimension(self) -> Optional[int]: ...


class SentenceTransformerBackend:
    def __init__(
        self,
        model_name: str = DEFAULT_EMBEDDING_MODEL,
        normalize: bool = True,
        device: Optional[str] = None,
    ):
        self.model_name = model_name
        self.normalize = normalize
        self.device = device
        self._model = None
        self._dimension: Optional[int] = None

    def load(self) -> None:
        if self._model is not None:
            return
        from sentence_transformers import SentenceTransformer

        logger.info(f"Carregando SentenceTransformer (torch): {self.model_name}")
        kwargs = {}
        if self.device:
            kwargs["device"] = self.device
        self._model = SentenceTransformer(self.model_name, **kwargs)
        try:
            if hasattr(self._model, "get_embedding_dimension"):
                self._dimension = int(self._model.get_embedding_dimension())
            else:
                self._dimension = int(self._model.get_sentence_embedding_dimension())
        except Exception:
            self._dimension = None
        logger.success(
            f"Embedding backend pronto (ST/torch) dim={self._dimension} normalize={self.normalize}"
        )

    def encode(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self._dimension or 0), dtype=np.float32)
        if self._model is None:
            self.load()
        embeddings = self._model.encode(
            texts,
            normalize_embeddings=self.normalize,
            convert_to_numpy=True,
        )
        arr = np.asarray(embeddings, dtype=np.float32)
        if arr.ndim == 1:
            arr = arr.reshape(1, -1)
        if self._dimension is None:
            self._dimension = int(arr.shape[1])
        return arr

    @property
    def dimension(self) -> Optional[int]:
        return self._dimension


class OrtEmbeddingBackend:
    def __init__(
        self,
        onnx_dir: str,
        file_name: Optional[str] = None,
        model_name: str = "onnx",
        normalize: bool = True,
        provider: str = "CUDAExecutionProvider",
        provider_options: Optional[Dict[str, Any]] = None,
    ):
        self.onnx_dir = str(onnx_dir)
        self.file_name = file_name
        self.model_name = model_name
        self.normalize = normalize
        self.provider = provider
        self.provider_options = provider_options or {}
        self._model = None
        self._dimension: Optional[int] = None

    def _resolve_file_name(self) -> Optional[str]:
        if self.file_name:
            return self.file_name
        meta = Path(self.onnx_dir) / "export_meta.json"
        if meta.exists():
            data = json.loads(meta.read_text(encoding="utf-8"))
            # TensorRT prefers base model.onnx over Optimum O4
            if self.provider == "TensorrtExecutionProvider":
                for cand in ("onnx/model.onnx", "model.onnx"):
                    if (Path(self.onnx_dir) / cand.replace("/", os.sep)).exists():
                        return cand
            pref = data.get("preferred_file")
            if pref:
                return pref.replace("\\", "/")
        onnx_files = sorted(Path(self.onnx_dir).rglob("*.onnx"))
        if not onnx_files:
            return None
        if self.provider == "TensorrtExecutionProvider":
            for p in onnx_files:
                if p.name == "model.onnx":
                    return str(p.relative_to(self.onnx_dir)).replace("\\", "/")
        for p in onnx_files:
            if "o4" in p.name.lower():
                return str(p.relative_to(self.onnx_dir)).replace("\\", "/")
        return str(onnx_files[-1].relative_to(self.onnx_dir)).replace("\\", "/")

    def load(self) -> None:
        if self._model is not None:
            return
        ensure_ort_gpu_dll_path()
        try:
            import onnxruntime as ort

            if hasattr(ort, "preload_dlls"):
                ort.preload_dlls(cuda=True, cudnn=True, msvc=True)
        except Exception as e:
            logger.warning(f"ORT preload_dlls: {e}")

        from sentence_transformers import SentenceTransformer

        file_name = self._resolve_file_name()
        model_kwargs: Dict[str, Any] = {"provider": self.provider}
        if file_name:
            model_kwargs["file_name"] = file_name.replace("\\", "/")
        if self.provider_options:
            model_kwargs["provider_options"] = self.provider_options

        logger.info(
            f"Carregando SentenceTransformer (onnx) dir={self.onnx_dir} "
            f"file={file_name} provider={self.provider}"
        )
        try:
            self._model = SentenceTransformer(
                self.onnx_dir,
                backend="onnx",
                model_kwargs=model_kwargs,
            )
        except Exception as e:
            if self.provider not in ("CPUExecutionProvider",):
                logger.warning(f"ORT provider {self.provider} falhou ({e}); tentando CUDA")
                model_kwargs["provider"] = "CUDAExecutionProvider"
                model_kwargs.pop("provider_options", None)
                self.provider = "CUDAExecutionProvider"
                self._model = SentenceTransformer(
                    self.onnx_dir,
                    backend="onnx",
                    model_kwargs=model_kwargs,
                )
            else:
                raise

        try:
            if hasattr(self._model, "get_embedding_dimension"):
                self._dimension = int(self._model.get_embedding_dimension())
            else:
                self._dimension = int(self._model.get_sentence_embedding_dimension())
        except Exception:
            self._dimension = None
        logger.success(
            f"Embedding backend pronto (ONNX/{self.provider}) "
            f"dim={self._dimension} normalize={self.normalize}"
        )

    def encode(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self._dimension or 0), dtype=np.float32)
        if self._model is None:
            self.load()
        embeddings = self._model.encode(
            texts,
            normalize_embeddings=self.normalize,
            convert_to_numpy=True,
        )
        arr = np.asarray(embeddings, dtype=np.float32)
        if arr.ndim == 1:
            arr = arr.reshape(1, -1)
        if self._dimension is None:
            self._dimension = int(arr.shape[1])
        return arr

    @property
    def dimension(self) -> Optional[int]:
        return self._dimension


def create_default_backend(
    model_name: Optional[str] = None,
    normalize: bool = True,
    backend: Optional[str] = None,
):
    choice = (backend or os.getenv("LICITAGYM_EMBEDDING_BACKEND") or "trt").lower()
    name = model_name or DEFAULT_EMBEDDING_MODEL
    onnx_dir = os.getenv(
        "LICITAGYM_ONNX_DIR",
        str(Path(__file__).resolve().parent / "models" / "onnx"),
    )
    if choice in ("trt", "tensorrt"):
        cache = os.getenv(
            "LICITAGYM_TRT_CACHE",
            str(Path(__file__).resolve().parent / "models" / "trt_cache"),
        )
        Path(cache).mkdir(parents=True, exist_ok=True)
        opts = {
            "device_id": 0,
            "trt_fp16_enable": True,
            "trt_engine_cache_enable": True,
            "trt_engine_cache_path": cache,
            "trt_max_workspace_size": int(
                os.getenv("LICITAGYM_TRT_WORKSPACE", str(2 * 1024 * 1024 * 1024))
            ),
        }
        return OrtEmbeddingBackend(
            onnx_dir=onnx_dir,
            model_name=name,
            normalize=normalize,
            provider="TensorrtExecutionProvider",
            provider_options=opts,
            file_name=os.getenv("LICITAGYM_ONNX_FILE", "onnx/model.onnx"),
        )
    if choice in ("onnx", "ort"):
        return OrtEmbeddingBackend(
            onnx_dir=onnx_dir,
            model_name=name,
            normalize=normalize,
            provider=os.getenv("LICITAGYM_ORT_PROVIDER", "CUDAExecutionProvider"),
        )
    return SentenceTransformerBackend(model_name=name, normalize=normalize)

