export type CapturedImage = {
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
  capturedAt: string;
  faceDetected: boolean;
  faceConfidence?: number;
};

type BrowserFaceDetector = {
  detect(source: CanvasImageSource): Promise<Array<{ boundingBox: DOMRectReadOnly; landmarks?: unknown[] }>>;
};

async function detectFace(canvas: HTMLCanvasElement) {
  const FaceDetectorCtor = (window as unknown as { FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => BrowserFaceDetector }).FaceDetector;
  if (!FaceDetectorCtor) {
    return { detected: false, confidence: 0 };
  }

  try {
    const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 1 });
    const faces = await detector.detect(canvas);
    return {
      detected: faces.length > 0,
      confidence: faces.length > 0 ? 0.9 : 0,
    };
  } catch {
    return { detected: false, confidence: 0 };
  }
}

export async function captureFromVideo(video: HTMLVideoElement): Promise<CapturedImage> {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');

  if (!context) throw new Error('Camera canvas is not available');

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
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

export async function startFrontCamera(video: HTMLVideoElement) {
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

