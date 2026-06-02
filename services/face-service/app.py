from __future__ import annotations

import base64
import hashlib
import json
import os
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from typing import Any

try:
    from PIL import Image
except Exception:  # pragma: no cover - runtime dependency check
    Image = None

try:
    import cv2
    import numpy as np
except Exception:  # pragma: no cover - runtime dependency check
    cv2 = None
    np = None


SERVICE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = Path(os.getenv("FACE_SERVICE_CONFIG", SERVICE_DIR / "config.json"))


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
DEFAULT_THRESHOLD = float(config_value("threshold", "FACE_SERVICE_THRESHOLD", 0.8))
FACE_IMAGE_SIZE = int(config_value("faceImageSize", "FACE_SERVICE_FACE_IMAGE_SIZE", 160))
MIN_FACE_SIZE = int(config_value("minFaceSize", "FACE_SERVICE_MIN_FACE_SIZE", 56))


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
    image = Image.open(BytesIO(data)).convert("RGB")
    return image


def detected_face_boxes(image) -> list[tuple[int, int, int, int]]:
    if cv2 is None or np is None:
        return []

    array = np.array(image)
    gray = cv2.cvtColor(array, cv2.COLOR_RGB2GRAY)
    gray = cv2.equalizeHist(gray)
    cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
    detector = cv2.CascadeClassifier(cascade_path)
    faces = detector.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=5, minSize=(MIN_FACE_SIZE, MIN_FACE_SIZE))
    if len(faces) == 0:
        return []

    boxes: list[tuple[int, int, int, int]] = []
    for x, y, w, h in faces:
        pad = int(max(w, h) * 0.22)
        left = max(0, int(x) - pad)
        top = max(0, int(y) - pad)
        right = min(image.width, int(x + w) + pad)
        bottom = min(image.height, int(y + h) + pad)
        boxes.append((left, top, right, bottom))
    return boxes


def largest_face_box(image) -> tuple[int, int, int, int] | None:
    boxes = detected_face_boxes(image)
    if not boxes:
        return None
    return max(boxes, key=lambda box: int(box[2] - box[0]) * int(box[3] - box[1]))



def crop_face_if_available(image):
    box = largest_face_box(image)
    if box is None:
        return image, False
    return image.crop(box), True


def normalized_face_array(image):
    if cv2 is None or np is None:
        return None
    array = np.array(image.convert("RGB"))
    gray = cv2.cvtColor(array, cv2.COLOR_RGB2GRAY)
    gray = cv2.resize(gray, (FACE_IMAGE_SIZE, FACE_IMAGE_SIZE), interpolation=cv2.INTER_AREA)
    gray = cv2.equalizeHist(gray)
    return gray


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


def histogram_similarity(image_a, image_b) -> float:
    a = image_a.resize((64, 64)).convert("L").histogram()
    b = image_b.resize((64, 64)).convert("L").histogram()
    total_a = sum(a) or 1
    total_b = sum(b) or 1
    intersection = sum(min(x / total_a, y / total_b) for x, y in zip(a, b))
    return max(0.0, min(1.0, intersection))


def dct_phash_similarity(face_a, face_b) -> float:
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


def lbp_histogram(gray) -> Any:
    center = gray[1:-1, 1:-1]
    code = np.zeros_like(center, dtype=np.uint8)
    neighbors = [
        gray[:-2, :-2], gray[:-2, 1:-1], gray[:-2, 2:],
        gray[1:-1, 2:], gray[2:, 2:], gray[2:, 1:-1],
        gray[2:, :-2], gray[1:-1, :-2],
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
    if cv2 is None or np is None:
        return None
    gray_a = normalized_face_array(face_a)
    gray_b = normalized_face_array(face_b)
    if gray_a is None or gray_b is None:
        return None

    detector = cv2.ORB_create(nfeatures=320, fastThreshold=12)
    keypoints_a, descriptors_a = detector.detectAndCompute(gray_a, None)
    keypoints_b, descriptors_b = detector.detectAndCompute(gray_b, None)
    if descriptors_a is None or descriptors_b is None or not keypoints_a or not keypoints_b:
        return None

    matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = matcher.match(descriptors_a, descriptors_b)
    if not matches:
        return None

    distances = [match.distance for match in matches]
    good_matches = [distance for distance in distances if distance <= 48]
    quality = len(good_matches) / max(16, min(len(keypoints_a), len(keypoints_b)))
    distance_score = 1.0 - (float(np.median(distances)) / 96.0)
    return float(max(0.0, min(1.0, (quality * 0.58) + (distance_score * 0.42))))


def blur_score(face) -> float | None:
    if cv2 is None or np is None:
        return None
    gray = normalized_face_array(face)
    if gray is None:
        return None
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def compare_images(reference_source: str, captured_source: str, threshold: float) -> dict[str, Any]:
    reference_bytes = load_image_bytes(reference_source)
    captured_bytes = load_image_bytes(captured_source)
    reference_image = open_image(reference_bytes)
    captured_image = open_image(captured_bytes)

    reference_face, reference_face_detected = crop_face_if_available(reference_image)
    captured_face, captured_face_detected = crop_face_if_available(captured_image)

    hash_similarity = dct_phash_similarity(reference_face, captured_face)
    hist_similarity = histogram_similarity(reference_face, captured_face)
    lbp_score = lbp_similarity(reference_face, captured_face)
    orb_score = orb_similarity(reference_face, captured_face)

    weighted_scores: list[tuple[float, float]] = [
        (hash_similarity, 0.24),
        (hist_similarity, 0.12),
    ]
    if lbp_score is not None:
        weighted_scores.append((lbp_score, 0.44))
    if orb_score is not None:
        weighted_scores.append((orb_score, 0.20))
    total_weight = sum(weight for _, weight in weighted_scores) or 1
    raw_confidence = sum(score * weight for score, weight in weighted_scores) / total_weight

    # Calibration keeps strong same-person matches above threshold while preventing
    # very weak texture/hash matches from looking overly confident.
    confidence = max(0.0, min(1.0, (raw_confidence - 0.18) / 0.72))

    face_detector_available = cv2 is not None and np is not None
    faces_detected = reference_face_detected and captured_face_detected if face_detector_available else None
    matched = confidence >= threshold
    reference_blur = blur_score(reference_face)
    captured_blur = blur_score(captured_face)

    if face_detector_available and not faces_detected:
        reason = "FACE_NOT_DETECTED_BY_OPENCV"
        matched = False
    elif reference_blur is not None and captured_blur is not None and min(reference_blur, captured_blur) < 18:
        reason = "FACE_IMAGE_TOO_BLURRY"
        matched = False
    elif not face_detector_available:
        reason = "MATCHED_BY_PHASH_NO_FACE_DETECTOR"
    else:
        reason = "MATCHED_BY_FACE_ENSEMBLE"

    return {
        "matched": matched,
        "confidence": round(confidence, 4),
        "livenessStatus": "not_checked",
        "reason": reason,
        "engine": "opencv_face_ensemble_v2" if face_detector_available else "phash",
        "faceDetected": faces_detected,
        "scores": {
            "hash": round(hash_similarity, 4),
            "histogram": round(hist_similarity, 4),
            "lbp": round(lbp_score, 4) if lbp_score is not None else None,
            "orb": round(orb_score, 4) if orb_score is not None else None,
            "raw": round(raw_confidence, 4),
            "referenceBlur": round(reference_blur, 2) if reference_blur is not None else None,
            "capturedBlur": round(captured_blur, 2) if captured_blur is not None else None,
        },
        "referenceHash": hashlib.sha256(reference_bytes).hexdigest(),
        "capturedHash": hashlib.sha256(captured_bytes).hexdigest(),
    }


class FaceServiceHandler(BaseHTTPRequestHandler):
    server_version = "YukSalesFaceService/0.1"

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            json_response(self, 200, {
                "ok": True,
                "service": "yuksales-face-service",
                "pillow": Image is not None,
                "opencv": cv2 is not None and np is not None,
                "engine": "opencv_face_ensemble_v2" if cv2 is not None and np is not None else "phash",
                "time": int(time.time()),
            })
            return
        json_response(self, 404, {"message": "Not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path.rstrip("/") != "/verify":
            json_response(self, 404, {"message": "Not found"})
            return

        if not require_auth(self):
            json_response(self, 401, {"message": "Unauthorized"})
            return

        try:
            payload = read_json_body(self)
            threshold = float(payload.get("threshold") or DEFAULT_THRESHOLD)
            result = compare_images(
                str(payload.get("referenceImageUrl") or ""),
                str(payload.get("capturedImageUrl") or ""),
                threshold,
            )
            json_response(self, 200, result)
        except Exception as error:
            json_response(self, 400, {
                "matched": False,
                "confidence": 0,
                "livenessStatus": "manual_review",
                "reason": str(error),
            })

    def log_message(self, format: str, *args: Any) -> None:
        print(f"[face-service] {self.address_string()} {format % args}", flush=True)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), FaceServiceHandler)
    print(f"YukSales face service listening on http://{HOST}:{PORT}", flush=True)
    print(f"Pillow installed: {Image is not None}; OpenCV installed: {cv2 is not None and np is not None}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
