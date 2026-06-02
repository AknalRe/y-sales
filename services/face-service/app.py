from __future__ import annotations

import base64
import hashlib
import json
import os
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
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


HOST = os.getenv("FACE_SERVICE_HOST", "127.0.0.1")
PORT = int(os.getenv("FACE_SERVICE_PORT", "5055"))
API_KEY = os.getenv("FACE_SERVICE_API_KEY", "")
MAX_IMAGE_BYTES = int(os.getenv("FACE_SERVICE_MAX_IMAGE_BYTES", str(4 * 1024 * 1024)))
DEFAULT_THRESHOLD = float(os.getenv("FACE_SERVICE_THRESHOLD", "0.8"))


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


def largest_face_box(image) -> tuple[int, int, int, int] | None:
    if cv2 is None or np is None:
        return None

    array = np.array(image)
    gray = cv2.cvtColor(array, cv2.COLOR_RGB2GRAY)
    cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
    detector = cv2.CascadeClassifier(cascade_path)
    faces = detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(48, 48))
    if len(faces) == 0:
        return None

    x, y, w, h = max(faces, key=lambda face: int(face[2]) * int(face[3]))
    pad = int(max(w, h) * 0.18)
    left = max(0, int(x) - pad)
    top = max(0, int(y) - pad)
    right = min(image.width, int(x + w) + pad)
    bottom = min(image.height, int(y + h) + pad)
    return left, top, right, bottom


def crop_face_if_available(image):
    box = largest_face_box(image)
    if box is None:
        return image, False
    return image.crop(box), True


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


def compare_images(reference_source: str, captured_source: str, threshold: float) -> dict[str, Any]:
    reference_bytes = load_image_bytes(reference_source)
    captured_bytes = load_image_bytes(captured_source)
    reference_image = open_image(reference_bytes)
    captured_image = open_image(captured_bytes)

    reference_face, reference_face_detected = crop_face_if_available(reference_image)
    captured_face, captured_face_detected = crop_face_if_available(captured_image)

    ref_hash = average_hash(reference_face)
    cap_hash = average_hash(captured_face)
    hash_similarity = 1.0 - (hamming_distance(ref_hash, cap_hash) / 64)
    hist_similarity = histogram_similarity(reference_face, captured_face)
    confidence = max(0.0, min(1.0, (hash_similarity * 0.68) + (hist_similarity * 0.32)))

    face_detector_available = cv2 is not None and np is not None
    faces_detected = reference_face_detected and captured_face_detected if face_detector_available else None
    matched = confidence >= threshold

    if face_detector_available and not faces_detected:
        reason = "FACE_NOT_DETECTED_BY_OPENCV"
        matched = False
    elif not face_detector_available:
        reason = "MATCHED_BY_PHASH_NO_FACE_DETECTOR"
    else:
        reason = "MATCHED_BY_FACE_CROP_PHASH"

    return {
        "matched": matched,
        "confidence": round(confidence, 4),
        "livenessStatus": "not_checked",
        "reason": reason,
        "engine": "opencv_phash" if face_detector_available else "phash",
        "faceDetected": faces_detected,
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
        print(f"[face-service] {self.address_string()} {format % args}")


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), FaceServiceHandler)
    print(f"YukSales face service listening on http://{HOST}:{PORT}")
    print(f"Pillow installed: {Image is not None}; OpenCV installed: {cv2 is not None and np is not None}")
    server.serve_forever()


if __name__ == "__main__":
    main()
