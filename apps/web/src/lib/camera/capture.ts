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

type BrowserFaceDetector = {
  detect(source: CanvasImageSource): Promise<Array<{ boundingBox: DOMRectReadOnly; landmarks?: unknown[] }>>;
};

async function detectFace(canvas: HTMLCanvasElement): Promise<FaceDetectionSnapshot> {
  const FaceDetectorCtor = (window as unknown as { FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => BrowserFaceDetector }).FaceDetector;
  if (!FaceDetectorCtor) {
    return { supported: false, detected: false, confidence: 0, checkedAt: new Date().toISOString() };
  }

  try {
    const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 1 });
    const faces = await detector.detect(canvas);
    const firstFace = faces[0]?.boundingBox;
    return {
      supported: true,
      detected: faces.length > 0,
      confidence: faces.length > 0 ? 0.9 : 0,
      box: firstFace ? {
        x: firstFace.x,
        y: firstFace.y,
        width: firstFace.width,
        height: firstFace.height,
      } : undefined,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return { supported: true, detected: false, confidence: 0, checkedAt: new Date().toISOString() };
  }
}

function drawVideoFrame(video: HTMLVideoElement, context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  context.setTransform(-1, 0, 0, 1, canvas.width, 0);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
}

export async function captureFromVideo(video: HTMLVideoElement): Promise<CapturedImage> {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');

  if (!context) throw new Error('Camera canvas is not available');

  drawVideoFrame(video, context, canvas);
  const face = await detectFace(canvas);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
  const sizeBytes = Math.round((dataUrl.length * 3) / 4);

  return {
    dataUrl,
    mimeType: 'image/jpeg',
    sizeBytes,
    capturedAt: new Date().toISOString(),
    faceDetected: face.detected,
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

  drawVideoFrame(video, context, canvas);
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
  return stream;
}

export function stopCamera(stream?: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}
