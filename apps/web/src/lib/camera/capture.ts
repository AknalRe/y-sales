import { FaceDetector as MediaPipeFaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

export type CapturedImage = {
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
  capturedAt: string;
  faceDetected: boolean;
  faceConfidence?: number;
};

export type FaceDetectionBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FaceDetectionSnapshot = {
  supported: boolean;
  detected: boolean;
  confidence: number;
  box?: FaceDetectionBox;
  checkedAt: string;
};

// ── MediaPipe singleton ───────────────────────────────────────────────────────
// Model is lazy-loaded only when the camera is first used, so it doesn't
// affect the initial app bundle or load time.

type DetectorState =
  | { status: 'idle' }
  | { status: 'loading'; promise: Promise<MediaPipeFaceDetector | null> }
  | { status: 'ready'; detector: MediaPipeFaceDetector }
  | { status: 'failed' };

let detectorState: DetectorState = { status: 'idle' };

async function loadMediaPipeDetector(): Promise<MediaPipeFaceDetector | null> {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    );
    const detector = await MediaPipeFaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.4,
      minSuppressionThreshold: 0.3,
    });
    return detector;
  } catch {
    return null;
  }
}

function getOrLoadDetector(): Promise<MediaPipeFaceDetector | null> {
  if (detectorState.status === 'ready') {
    return Promise.resolve(detectorState.detector);
  }
  if (detectorState.status === 'failed') {
    return Promise.resolve(null);
  }
  if (detectorState.status === 'loading') {
    return detectorState.promise;
  }

  // idle → kick off load
  const promise = loadMediaPipeDetector().then((detector) => {
    if (detector) {
      detectorState = { status: 'ready', detector };
    } else {
      detectorState = { status: 'failed' };
    }
    return detector;
  });
  detectorState = { status: 'loading', promise };
  return promise;
}

// ── Browser native FaceDetector (Chrome / Android) ───────────────────────────

type BrowserFaceDetector = {
  detect(source: CanvasImageSource): Promise<Array<{ boundingBox: DOMRectReadOnly; landmarks?: unknown[] }>>;
};

function getBrowserFaceDetector(): BrowserFaceDetector | null {
  const ctor = (window as unknown as { FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => BrowserFaceDetector }).FaceDetector;
  return ctor ? new ctor({ fastMode: true, maxDetectedFaces: 1 }) : null;
}

// ── Core detection logic ──────────────────────────────────────────────────────

async function detectFace(canvas: HTMLCanvasElement): Promise<FaceDetectionSnapshot> {
  const now = () => new Date().toISOString();

  // 1. Try MediaPipe first (works on all platforms including iOS Safari)
  const mediaPipeDetector = await getOrLoadDetector();
  if (mediaPipeDetector) {
    try {
      const result = mediaPipeDetector.detect(canvas);
      const detections = result.detections ?? [];
      const first = detections[0];
      const confidence = first?.categories?.[0]?.score ?? 0;
      const box = first?.boundingBox;
      return {
        supported: true,
        detected: detections.length > 0,
        confidence,
        box: box
          ? { x: box.originX, y: box.originY, width: box.width, height: box.height }
          : undefined,
        checkedAt: now(),
      };
    } catch {
      // MediaPipe failed on this frame — fall through to browser API
    }
  }

  // 2. Fallback: browser native FaceDetector (Chrome/Android only)
  const browserDetector = getBrowserFaceDetector();
  if (browserDetector) {
    try {
      const faces = await browserDetector.detect(canvas);
      const firstFace = faces[0]?.boundingBox;
      return {
        supported: true,
        detected: faces.length > 0,
        confidence: faces.length > 0 ? 0.9 : 0,
        box: firstFace
          ? { x: firstFace.x, y: firstFace.y, width: firstFace.width, height: firstFace.height }
          : undefined,
        checkedAt: now(),
      };
    } catch {
      return { supported: true, detected: false, confidence: 0, checkedAt: now() };
    }
  }

  // 3. Both unavailable (MediaPipe still loading / no WASM support)
  // Treat as "not yet supported" — overlay shows loading state rather than error
  return { supported: false, detected: false, confidence: 0, checkedAt: now() };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Draw the video frame as-is (no transform) — used for live face detection. */
function drawVideoFrameNormal(video: HTMLVideoElement, context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
}

/**
 * Draw the video frame mirrored horizontally — used when capturing a selfie
 * photo so that the saved image matches what the user sees in the live preview
 * (front camera is displayed with scaleX(-1) on the <video> element).
 */
function drawVideoFrameMirrored(video: HTMLVideoElement, context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  context.setTransform(-1, 0, 0, 1, canvas.width, 0);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  context.setTransform(1, 0, 0, 1, 0, 0);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function captureFromVideo(video: HTMLVideoElement): Promise<CapturedImage> {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');

  if (!context) throw new Error('Camera canvas is not available');

  // Use the normal (unflipped) frame for face detection so coordinates are accurate.
  drawVideoFrameNormal(video, context, canvas);
  const face = await detectFace(canvas);

  // Now redraw the frame mirrored so the captured photo matches the live preview.
  drawVideoFrameMirrored(video, context, canvas);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
  const sizeBytes = Math.round((dataUrl.length * 3) / 4);

  return {
    dataUrl,
    mimeType: 'image/jpeg',
    sizeBytes,
    capturedAt: new Date().toISOString(),
    // If the detector is not yet supported/loaded, we still allow the photo
    // through — server-side validation is the final authority.
    faceDetected: face.supported ? face.detected : true,
    faceConfidence: face.confidence,
  };
}

export async function detectFaceFromVideo(video: HTMLVideoElement): Promise<FaceDetectionSnapshot> {
  if (!video.videoWidth || !video.videoHeight) {
    return { supported: true, detected: false, confidence: 0, checkedAt: new Date().toISOString() };
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');

  if (!context) {
    return { supported: true, detected: false, confidence: 0, checkedAt: new Date().toISOString() };
  }

  // Use unflipped frame so face-detection bounding box coordinates are in
  // the same space as the original video — getOverlayBox() in LiveFaceOverlay
  // already accounts for the CSS scaleX(-1) mirror on the <video> element.
  drawVideoFrameNormal(video, context, canvas);
  return detectFace(canvas);
}

export async function startFrontCamera(video: HTMLVideoElement) {
  video.style.transform = 'scaleX(-1)';
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user' },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();

  // Kick off MediaPipe loading in the background as soon as the camera starts,
  // so the model is ready by the time the user takes a photo.
  void getOrLoadDetector();

  return stream;
}

export function stopCamera(stream?: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}
