from __future__ import annotations

import base64
import hashlib
import json
import os
import sys
import time
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from typing import Any

try:
    from PIL import Image
except Exception:  # pragma: no cover
    Image = None

try:
    import cv2
    import numpy as np
except Exception:  # pragma: no cover
    cv2 = None
    np = None

try:
    from skimage.metrics import structural_similarity as ssim_skimage
    _HAS_SKIMAGE = True
except Exception:
    _HAS_SKIMAGE = False


SERVICE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = Path(os.getenv("FACE_SERVICE_CONFIG", SERVICE_DIR / "config.json"))
MODELS_DIR = SERVICE_DIR / "models"

# OpenCV DNN face detector model files (SSD ResNet-10, Apache 2.0 / BSD)
DNN_PROTOTXT_URL = (
    "https://raw.githubusercontent.com/opencv/opencv/master/"
    "samples/dnn/face_detector/deploy.prototxt"
)
DNN_CAFFEMODEL_URL = (
    "https://github.com/opencv/opencv_3rdparty/raw/dnn_samples_face_detector_20170830/"
    "res10_300x300_ssd_iter_140000.caffemodel"
)
DNN_PROTOTXT_PATH = MODELS_DIR / "deploy.prototxt"
DNN_CAFFEMODEL_PATH = MODELS_DIR / "res10_300x300_ssd_iter_140000.caffemodel"


def ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def log(msg: str, **extra: Any) -> None:
    parts = [f"[{ts()}]", "[face-service]", msg]
    for k, v in extra.items():
        parts.append(f"{k}={v}")
    print(" ".join(parts), flush=True)


def load_config() -> dict[str, Any]:
    if not CONFIG_PATH.exists():
        return {}
    with CONFIG_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


CONFIG = load_config()


def config_value(key: str, env_key: str, default: Any) -> Any:
    env_value = os.getenv(env_key)
    if env_value is not None:
        return env_value
    return CONFIG.get(key, default)


HOST = str(config_value("host", "FACE_SERVICE_HOST", "127.0.0.1"))
PORT = int(config_value("port", "FACE_SERVICE_PORT", 5055))
API_KEY = str(config_value("apiKey", "FACE_SERVICE_API_KEY", ""))
MAX_IMAGE_BYTES = int(config_value("maxImageBytes", "FACE_SERVICE_MAX_IMAGE_BYTES", 4 * 1024 * 1024))
DEFAULT_THRESHOLD = float(config_value("threshold", "FACE_SERVICE_THRESHOLD", 0.80))
FACE_IMAGE_SIZE = int(config_value("faceImageSize", "FACE_SERVICE_FACE_IMAGE_SIZE", 160))
MIN_FACE_SIZE = int(config_value("minFaceSize", "FACE_SERVICE_MIN_FACE_SIZE", 48))
DNN_CONFIDENCE_THRESHOLD = float(config_value("dnnConfidence", "FACE_SERVICE_DNN_CONFIDENCE", 0.55))


# ── OpenCV DNN face detector (singleton, loaded once at startup) ──────────────

_dnn_net: Any = None  # cv2.dnn.Net | None


def _download_model_file(url: str, dest: Path) -> bool:
    """Download a model file if it does not already exist. Returns True on success."""
    if dest.exists():
        return True
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    log(f"Downloading model {dest.name} from {url}")
    try:
        urllib.request.urlretrieve(url, dest)
        log(f"Model downloaded: {dest.name} ({dest.stat().st_size // 1024} KB)")
        return True
    except Exception as exc:
        log(f"Failed to download {dest.name}: {exc}")
        return False


def load_dnn_net() -> Any:
    """Load or return cached OpenCV DNN SSD face detector."""
    global _dnn_net
    if _dnn_net is not None:
        return _dnn_net
    if cv2 is None:
        return None

    proto_ok = _download_model_file(DNN_PROTOTXT_URL, DNN_PROTOTXT_PATH)
    model_ok = _download_model_file(DNN_CAFFEMODEL_URL, DNN_CAFFEMODEL_PATH)

    if not proto_ok or not model_ok:
        log("DNN model unavailable — falling back to Haar Cascade")
        return None

    try:
        net = cv2.dnn.readNetFromCaffe(str(DNN_PROTOTXT_PATH), str(DNN_CAFFEMODEL_PATH))
        _dnn_net = net
        log("OpenCV DNN face detector loaded (SSD ResNet-10)")
        return net
    except Exception as exc:
        log(f"DNN load failed: {exc} — falling back to Haar Cascade")
        return None


# ── HTTP helpers ──────────────────────────────────────────────────────────────

def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("content-type", "application/json")
    handler.send_header("content-length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def read_json_body(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    content_length = int(handler.headers.get("content-length", "0"))
    if content_length <= 0:
        return {}
    if content_length > 2 * MAX_IMAGE_BYTES + 20_000:
        raise ValueError("REQUEST_TOO_LARGE")
    raw = handler.rfile.read(content_length)
    return json.loads(raw.decode("utf-8"))


def require_auth(handler: BaseHTTPRequestHandler) -> bool:
    if not API_KEY:
        return True
    expected = f"Bearer {API_KEY}"
    return handler.headers.get("authorization", "") == expected


def load_image_bytes(value: str) -> bytes:
    if not value:
        raise ValueError("IMAGE_URL_REQUIRED")
    if value.startswith("data:image/"):
        _, encoded = value.split(",", 1)
        data = base64.b64decode(encoded, validate=True)
    elif value.startswith("http://") or value.startswith("https://"):
        with urllib.request.urlopen(value, timeout=10) as response:
            data = response.read(MAX_IMAGE_BYTES + 1)
    else:
        raise ValueError("UNSUPPORTED_IMAGE_SOURCE")
    if len(data) > MAX_IMAGE_BYTES:
        raise ValueError("IMAGE_TOO_LARGE")
    return data


def open_image(data: bytes):
    if Image is None:
        raise RuntimeError("PILLOW_NOT_INSTALLED")
    return Image.open(BytesIO(data)).convert("RGB")


# ── Face detection ────────────────────────────────────────────────────────────

def _detect_faces_dnn(image) -> list[tuple[int, int, int, int]]:
    """
    OpenCV DNN SSD ResNet-10 detector.
    Returns list of (left, top, right, bottom) boxes.
    Far more accurate than Haar Cascade — handles tilted faces, low light, partial occlusion.
    """
    net = load_dnn_net()
    if net is None:
        return []

    array = np.array(image)
    h, w = array.shape[:2]
    blob = cv2.dnn.blobFromImage(
        cv2.resize(array, (300, 300)),
        scalefactor=1.0,
        size=(300, 300),
        mean=(104.0, 177.0, 123.0),
        swapRB=False,
        crop=False,
    )
    net.setInput(blob)
    detections = net.forward()  # shape: (1, 1, N, 7)

    boxes: list[tuple[int, int, int, int]] = []
    for i in range(detections.shape[2]):
        confidence = float(detections[0, 0, i, 2])
        if confidence < DNN_CONFIDENCE_THRESHOLD:
            continue
        x1 = max(0, int(detections[0, 0, i, 3] * w))
        y1 = max(0, int(detections[0, 0, i, 4] * h))
        x2 = min(w, int(detections[0, 0, i, 5] * w))
        y2 = min(h, int(detections[0, 0, i, 6] * h))
        face_w = x2 - x1
        face_h = y2 - y1
        if face_w < MIN_FACE_SIZE or face_h < MIN_FACE_SIZE:
            continue
        # Add padding so comparison algorithms see more context
        pad = int(max(face_w, face_h) * 0.20)
        boxes.append((
            max(0, x1 - pad),
            max(0, y1 - pad),
            min(w, x2 + pad),
            min(h, y2 + pad),
        ))

    return boxes


def _detect_faces_haar(image) -> list[tuple[int, int, int, int]]:
    """
    Multi-cascade Haar Cascade fallback (when DNN model unavailable).
    Tries frontal → alt2 → profile cascades for maximum recall.
    """
    if cv2 is None or np is None:
        return []

    array = np.array(image)
    gray = cv2.cvtColor(array, cv2.COLOR_RGB2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    cascades = [
        "haarcascade_frontalface_default.xml",
        "haarcascade_frontalface_alt2.xml",
        "haarcascade_profileface.xml",
    ]

    all_boxes: list[tuple[int, int, int, int]] = []
    for cascade_name in cascades:
        path = os.path.join(cv2.data.haarcascades, cascade_name)
        if not os.path.exists(path):
            continue
        detector = cv2.CascadeClassifier(path)
        faces = detector.detectMultiScale(
            gray,
            scaleFactor=1.10,
            minNeighbors=4,
            minSize=(MIN_FACE_SIZE, MIN_FACE_SIZE),
            flags=cv2.CASCADE_SCALE_IMAGE,
        )
        if len(faces) > 0:
            for x, y, w, h in faces:
                pad = int(max(w, h) * 0.22)
                all_boxes.append((
                    max(0, int(x) - pad),
                    max(0, int(y) - pad),
                    min(image.width, int(x + w) + pad),
                    min(image.height, int(y + h) + pad),
                ))
            break  # stop at first cascade that finds something

    return all_boxes


def detected_face_boxes(image) -> list[tuple[int, int, int, int]]:
    """Detect face boxes — tries DNN first, falls back to Haar Cascade."""
    if cv2 is None or np is None:
        return []
    # DNN is the primary detector
    boxes = _detect_faces_dnn(image)
    if boxes:
        return boxes
    # Haar Cascade fallback
    log("DNN found no faces — trying Haar Cascade fallback")
    return _detect_faces_haar(image)


def largest_face_box(image) -> tuple[int, int, int, int] | None:
    boxes = detected_face_boxes(image)
    if not boxes:
        return None
    return max(boxes, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))


def crop_face_if_available(image):
    box = largest_face_box(image)
    if box is None:
        return image, False
    return image.crop(box), True


# ── Image normalization ───────────────────────────────────────────────────────

def clahe_normalize(image):
    """
    Apply CLAHE to normalize uneven lighting before comparison.
    Handles overexposed selfies and dim indoor shots more robustly than equalizeHist.
    """
    if cv2 is None or np is None:
        return image
    array = np.array(image.convert("RGB"))
    lab = cv2.cvtColor(array, cv2.COLOR_RGB2LAB)
    l_channel, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_eq = clahe.apply(l_channel)
    merged = cv2.merge([l_eq, a, b])
    rgb = cv2.cvtColor(merged, cv2.COLOR_LAB2RGB)
    return Image.fromarray(rgb)


def normalized_face_array(image):
    """Resize + CLAHE normalize to standard face patch for similarity metrics."""
    if cv2 is None or np is None:
        return None
    array = np.array(image.convert("RGB"))
    gray = cv2.cvtColor(array, cv2.COLOR_RGB2GRAY)
    gray = cv2.resize(gray, (FACE_IMAGE_SIZE, FACE_IMAGE_SIZE), interpolation=cv2.INTER_AREA)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)
    return gray


# ── Similarity metrics ────────────────────────────────────────────────────────

def average_hash(image, size: int = 8) -> int:
    small = image.convert("L").resize((size, size))
    pixels = list(small.getdata())
    avg = sum(pixels) / len(pixels)
    bits = 0
    for pixel in pixels:
        bits = (bits << 1) | (1 if pixel >= avg else 0)
    return bits


def hamming_distance(a: int, b: int) -> int:
    return (a ^ b).bit_count()


def dct_phash_similarity(face_a, face_b) -> float:
    """Perceptual hash via DCT — invariant to small color/brightness shifts."""
    if cv2 is None or np is None:
        ref_hash = average_hash(face_a)
        cap_hash = average_hash(face_b)
        return 1.0 - (hamming_distance(ref_hash, cap_hash) / 64)

    def phash(image) -> int:
        gray = normalized_face_array(image)
        if gray is None:
            return average_hash(image)
        small = cv2.resize(gray, (32, 32), interpolation=cv2.INTER_AREA).astype("float32")
        dct = cv2.dct(small)
        low = dct[:8, :8]
        median = float(np.median(low[1:, 1:]))
        bits = 0
        for value in low.flatten():
            bits = (bits << 1) | (1 if float(value) >= median else 0)
        return bits

    return max(0.0, min(1.0, 1.0 - (hamming_distance(phash(face_a), phash(face_b)) / 64)))


def ssim_similarity(face_a, face_b) -> float | None:
    """
    Structural Similarity Index — measures perceived structural likeness.
    Uses scikit-image if available, otherwise a fast NumPy implementation.
    More robust to lighting differences than histogram methods.
    """
    if np is None:
        return None

    gray_a = normalized_face_array(face_a)
    gray_b = normalized_face_array(face_b)
    if gray_a is None or gray_b is None:
        return None

    if _HAS_SKIMAGE:
        try:
            score = float(ssim_skimage(gray_a, gray_b, data_range=255))
            return max(0.0, min(1.0, score))
        except Exception:
            pass

    # NumPy SSIM implementation (no extra dependencies)
    a = gray_a.astype("float64")
    b = gray_b.astype("float64")
    k1, k2, L = 0.01, 0.03, 255.0
    c1, c2 = (k1 * L) ** 2, (k2 * L) ** 2
    mu_a, mu_b = a.mean(), b.mean()
    sigma_a = ((a - mu_a) ** 2).mean()
    sigma_b = ((b - mu_b) ** 2).mean()
    sigma_ab = ((a - mu_a) * (b - mu_b)).mean()
    numerator = (2 * mu_a * mu_b + c1) * (2 * sigma_ab + c2)
    denominator = (mu_a ** 2 + mu_b ** 2 + c1) * (sigma_a + sigma_b + c2)
    score = numerator / (denominator + 1e-10)
    return float(max(0.0, min(1.0, score)))


def lbp_histogram(gray) -> Any:
    center = gray[1:-1, 1:-1]
    code = np.zeros_like(center, dtype=np.uint8)
    neighbors = [
        gray[:-2, :-2], gray[:-2, 1:-1], gray[:-2, 2:],
        gray[1:-1, 2:],  gray[2:, 2:],   gray[2:, 1:-1],
        gray[2:, :-2],   gray[1:-1, :-2],
    ]
    for index, neighbor in enumerate(neighbors):
        code |= ((neighbor >= center).astype(np.uint8) << index)
    hist, _ = np.histogram(code.ravel(), bins=256, range=(0, 256), density=True)
    return hist.astype("float32")


def chi_square_similarity(hist_a, hist_b) -> float:
    score = 0.5 * np.sum(((hist_a - hist_b) ** 2) / (hist_a + hist_b + 1e-8))
    return float(max(0.0, min(1.0, 1.0 / (1.0 + score * 8.0))))


def lbp_similarity(face_a, face_b) -> float | None:
    if cv2 is None or np is None:
        return None
    gray_a = normalized_face_array(face_a)
    gray_b = normalized_face_array(face_b)
    if gray_a is None or gray_b is None:
        return None
    return chi_square_similarity(lbp_histogram(gray_a), lbp_histogram(gray_b))


def orb_similarity(face_a, face_b) -> float | None:
    """ORB keypoint matching — detects geometric feature correspondences."""
    if cv2 is None or np is None:
        return None
    gray_a = normalized_face_array(face_a)
    gray_b = normalized_face_array(face_b)
    if gray_a is None or gray_b is None:
        return None

    detector = cv2.ORB_create(nfeatures=400, fastThreshold=10)
    keypoints_a, descriptors_a = detector.detectAndCompute(gray_a, None)
    keypoints_b, descriptors_b = detector.detectAndCompute(gray_b, None)
    if descriptors_a is None or descriptors_b is None or not keypoints_a or not keypoints_b:
        return None

    matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = matcher.match(descriptors_a, descriptors_b)
    if not matches:
        return None

    distances = [m.distance for m in matches]
    good_matches = [d for d in distances if d <= 45]
    quality = len(good_matches) / max(16, min(len(keypoints_a), len(keypoints_b)))
    distance_score = 1.0 - (float(np.median(distances)) / 96.0)
    return float(max(0.0, min(1.0, (quality * 0.60) + (distance_score * 0.40))))


def blur_score(face) -> float | None:
    if cv2 is None or np is None:
        return None
    gray = normalized_face_array(face)
    if gray is None:
        return None
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


# ── Main comparison pipeline ──────────────────────────────────────────────────

def compare_images(reference_source: str, captured_source: str, threshold: float) -> dict[str, Any]:
    t0 = time.monotonic()
    reference_bytes = load_image_bytes(reference_source)
    captured_bytes = load_image_bytes(captured_source)
    reference_image = open_image(reference_bytes)
    captured_image = open_image(captured_bytes)

    log("Images loaded",
        ref_size=f"{reference_image.width}x{reference_image.height}",
        cap_size=f"{captured_image.width}x{captured_image.height}",
        ref_bytes=len(reference_bytes),
        cap_bytes=len(captured_bytes))

    # Normalize lighting before any processing
    reference_image = clahe_normalize(reference_image)
    captured_image = clahe_normalize(captured_image)

    # Detect and crop faces
    reference_face, reference_face_detected = crop_face_if_available(reference_image)
    captured_face, captured_face_detected = crop_face_if_available(captured_image)

    face_detector_available = cv2 is not None and np is not None

    log("Face detection",
        engine="dnn+haar" if face_detector_available else "none",
        ref_detected=reference_face_detected,
        cap_detected=captured_face_detected,
        ref_face_size=f"{reference_face.width}x{reference_face.height}" if reference_face_detected else "full_image",
        cap_face_size=f"{captured_face.width}x{captured_face.height}" if captured_face_detected else "full_image")

    ref_hash_hex = hashlib.sha256(reference_bytes).hexdigest()
    cap_hash_hex = hashlib.sha256(captured_bytes).hexdigest()

    # STRICT REJECTION: captured image has no detectable face
    if face_detector_available and not captured_face_detected:
        elapsed = time.monotonic() - t0
        log("REJECTED: no face in captured image", elapsed_ms=round(elapsed * 1000, 1))
        return {
            "matched": False,
            "confidence": 0.0,
            "livenessStatus": "not_checked",
            "reason": "NO_FACE_IN_CAPTURED_IMAGE",
            "engine": "dnn_ssd+haar_cascade",
            "faceDetected": False,
            "scores": {},
            "referenceHash": ref_hash_hex,
            "capturedHash": cap_hash_hex,
        }

    # STRICT REJECTION: reference image has no detectable face
    if face_detector_available and not reference_face_detected:
        elapsed = time.monotonic() - t0
        log("REJECTED: no face in reference image", elapsed_ms=round(elapsed * 1000, 1))
        return {
            "matched": False,
            "confidence": 0.0,
            "livenessStatus": "not_checked",
            "reason": "NO_FACE_IN_REFERENCE_IMAGE",
            "engine": "dnn_ssd+haar_cascade",
            "faceDetected": False,
            "scores": {},
            "referenceHash": ref_hash_hex,
            "capturedHash": cap_hash_hex,
        }

    # ── Similarity metrics ────────────────────────────────────────────────────

    phash_score = dct_phash_similarity(reference_face, captured_face)
    ssim_score = ssim_similarity(reference_face, captured_face)
    lbp_score = lbp_similarity(reference_face, captured_face)
    orb_score = orb_similarity(reference_face, captured_face)
    reference_blur = blur_score(reference_face)
    captured_blur = blur_score(captured_face)

    # ── Weighted ensemble ────────────────────────────────────────────────────
    # Weights tuned for face-photo-to-selfie comparison:
    #   phash:  20% — cheap global hash, low weight
    #   ssim:   30% — structural similarity, lighting-robust
    #   lbp:    30% — texture patterns, good for same-lighting pairs
    #   orb:    20% — keypoint geometry, strong discriminator when features are clear
    weighted_scores: list[tuple[float, float]] = [(phash_score, 0.20)]
    if ssim_score is not None:
        weighted_scores.append((ssim_score, 0.30))
    if lbp_score is not None:
        weighted_scores.append((lbp_score, 0.30))
    if orb_score is not None:
        weighted_scores.append((orb_score, 0.20))

    total_weight = sum(w for _, w in weighted_scores) or 1.0
    raw_confidence = sum(s * w for s, w in weighted_scores) / total_weight

    # Calibration: shift raw scores so genuine pairs reliably exceed threshold.
    # New formula is less aggressive than the previous (0.18 offset → 0.12).
    confidence = max(0.0, min(1.0, (raw_confidence - 0.12) / 0.78))

    faces_detected = reference_face_detected and captured_face_detected
    matched = confidence >= threshold

    # Blur quality check (threshold lowered from 18 → 8 — tolerates typical selfies)
    blur_warning = False
    if reference_blur is not None and captured_blur is not None:
        min_blur = min(reference_blur, captured_blur)
        if min_blur < 8:
            reason = "FACE_IMAGE_TOO_BLURRY"
            matched = False
        elif min_blur < 20:
            blur_warning = True  # warn but do not reject

    if not face_detector_available:
        reason = "MATCHED_BY_PHASH_NO_FACE_DETECTOR"
    elif not faces_detected:
        reason = "FACE_NOT_DETECTED_BY_OPENCV"
        matched = False
    elif blur_warning and matched:
        reason = "MATCHED_LOW_QUALITY_IMAGE"
    elif matched:
        reason = "MATCHED_BY_FACE_ENSEMBLE"
    else:
        reason = "NOT_MATCHED"

    elapsed = time.monotonic() - t0
    engine = "dnn_ssd+haar_cascade" if face_detector_available else "phash_only"

    log("Comparison complete",
        engine=engine,
        matched=matched,
        confidence=round(confidence, 4),
        threshold=threshold,
        reason=reason,
        phash=round(phash_score, 4),
        ssim=round(ssim_score, 4) if ssim_score is not None else "n/a",
        lbp=round(lbp_score, 4) if lbp_score is not None else "n/a",
        orb=round(orb_score, 4) if orb_score is not None else "n/a",
        ref_blur=round(reference_blur, 2) if reference_blur is not None else "n/a",
        cap_blur=round(captured_blur, 2) if captured_blur is not None else "n/a",
        blur_warning=blur_warning,
        elapsed_ms=round(elapsed * 1000, 1))

    return {
        "matched": matched,
        "confidence": round(confidence, 4),
        "livenessStatus": "not_checked",
        "reason": reason,
        "engine": engine,
        "faceDetected": faces_detected,
        "blurWarning": blur_warning,
        "scores": {
            "phash": round(phash_score, 4),
            "ssim": round(ssim_score, 4) if ssim_score is not None else None,
            "lbp": round(lbp_score, 4) if lbp_score is not None else None,
            "orb": round(orb_score, 4) if orb_score is not None else None,
            "raw": round(raw_confidence, 4),
            "referenceBlur": round(reference_blur, 2) if reference_blur is not None else None,
            "capturedBlur": round(captured_blur, 2) if captured_blur is not None else None,
        },
        "referenceHash": ref_hash_hex,
        "capturedHash": cap_hash_hex,
    }


# ── HTTP server ───────────────────────────────────────────────────────────────

class FaceServiceHandler(BaseHTTPRequestHandler):
    server_version = "YukSalesFaceService/0.3"

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            net = load_dnn_net()
            json_response(self, 200, {
                "ok": True,
                "service": "yuksales-face-service",
                "version": "0.3",
                "pillow": Image is not None,
                "opencv": cv2 is not None and np is not None,
                "dnn_loaded": net is not None,
                "skimage": _HAS_SKIMAGE,
                "engine": "dnn_ssd+haar_cascade" if cv2 is not None and np is not None else "phash_only",
                "dnn_confidence_threshold": DNN_CONFIDENCE_THRESHOLD,
                "default_threshold": DEFAULT_THRESHOLD,
                "time": int(time.time()),
            })
            return
        json_response(self, 404, {"message": "Not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path.rstrip("/") != "/verify":
            json_response(self, 404, {"message": "Not found"})
            return

        if not require_auth(self):
            log("Auth failed", remote=self.address_string())
            json_response(self, 401, {"message": "Unauthorized"})
            return

        request_id = hashlib.md5(f"{time.time()}-{self.address_string()}".encode()).hexdigest()[:8]
        t0 = time.monotonic()
        log(f"[REQ {request_id}] POST /verify from {self.address_string()}")

        try:
            payload = read_json_body(self)
            threshold = float(payload.get("threshold") or DEFAULT_THRESHOLD)
            has_ref = bool(payload.get("referenceImageUrl"))
            has_cap = bool(payload.get("capturedImageUrl"))
            log(f"[REQ {request_id}] Payload",
                has_reference=has_ref,
                has_captured=has_cap,
                threshold=threshold)

            if not has_ref or not has_cap:
                raise ValueError("MISSING_IMAGE_URL")

            result = compare_images(
                str(payload.get("referenceImageUrl") or ""),
                str(payload.get("capturedImageUrl") or ""),
                threshold,
            )
            elapsed = time.monotonic() - t0
            log(f"[REQ {request_id}] Response",
                matched=result["matched"],
                confidence=result["confidence"],
                reason=result["reason"],
                engine=result["engine"],
                elapsed_ms=round(elapsed * 1000, 1))
            json_response(self, 200, result)

        except Exception as error:
            elapsed = time.monotonic() - t0
            log(f"[REQ {request_id}] ERROR",
                error=str(error),
                elapsed_ms=round(elapsed * 1000, 1))
            json_response(self, 400, {
                "matched": False,
                "confidence": 0,
                "livenessStatus": "manual_review",
                "reason": str(error),
            })

    def log_message(self, format: str, *args: Any) -> None:
        pass  # Use our own log()


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    log("Starting face service",
        version="0.3",
        host=HOST,
        port=PORT,
        threshold=DEFAULT_THRESHOLD,
        dnn_confidence=DNN_CONFIDENCE_THRESHOLD,
        min_face_size=MIN_FACE_SIZE,
        face_image_size=FACE_IMAGE_SIZE,
        has_api_key=bool(API_KEY),
        skimage=_HAS_SKIMAGE)
    log(f"Pillow={'OK' if Image is not None else 'MISSING'} | "
        f"OpenCV={'OK' if cv2 is not None and np is not None else 'MISSING'}")

    # Pre-load DNN model at startup so first request is fast
    if cv2 is not None:
        load_dnn_net()

    server = ThreadingHTTPServer((HOST, PORT), FaceServiceHandler)
    log(f"Listening on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
