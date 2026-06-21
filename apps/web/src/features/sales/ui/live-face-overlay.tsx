import { useEffect, useRef, useState, type RefObject } from 'react';
import { ScanFace } from 'lucide-react';
import { detectFaceFromVideo, type FaceDetectionSnapshot } from '../../../lib/camera/capture';

type LiveFaceOverlayProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
};

type OverlayBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function getOverlayBox(video: HTMLVideoElement, snapshot: FaceDetectionSnapshot | null): OverlayBox | null {
  if (!snapshot?.box || !video.videoWidth || !video.videoHeight) return null;

  const viewWidth = video.clientWidth;
  const viewHeight = video.clientHeight;
  if (!viewWidth || !viewHeight) return null;

  const scale = Math.max(viewWidth / video.videoWidth, viewHeight / video.videoHeight);
  const renderedWidth = video.videoWidth * scale;
  const renderedHeight = video.videoHeight * scale;
  const offsetX = (viewWidth - renderedWidth) / 2;
  const offsetY = (viewHeight - renderedHeight) / 2;

  // Mirror the X coordinate if the video element is horizontally flipped
  const isMirrored = video.style.transform.includes('scaleX(-1)');
  let boxLeft = snapshot.box.x;
  if (isMirrored) {
    boxLeft = video.videoWidth - (snapshot.box.x + snapshot.box.width);
  }

  return {
    left: offsetX + boxLeft * scale,
    top: offsetY + snapshot.box.y * scale,
    width: snapshot.box.width * scale,
    height: snapshot.box.height * scale,
  };
}

export function LiveFaceOverlay({ videoRef, stream }: LiveFaceOverlayProps) {
  const [snapshot, setSnapshot] = useState<FaceDetectionSnapshot | null>(null);
  const [box, setBox] = useState<OverlayBox | null>(null);
  const detectingRef = useRef(false);

  useEffect(() => {
    if (!stream || !videoRef.current) {
      setSnapshot(null);
      return;
    }

    let cancelled = false;
    const runDetection = async () => {
      if (detectingRef.current || !videoRef.current) return;
      detectingRef.current = true;
      try {
        const video = videoRef.current;
        const nextSnapshot = video ? await detectFaceFromVideo(video) : null;
        if (!cancelled) {
          setSnapshot(nextSnapshot);
          setBox(video ? getOverlayBox(video, nextSnapshot) : null);
        }
      } finally {
        detectingRef.current = false;
      }
    };

    void runDetection();
    const interval = window.setInterval(runDetection, 650);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [stream, videoRef]);

  useEffect(() => {
    const onResize = () => {
      const video = videoRef.current;
      setBox(video ? getOverlayBox(video, snapshot) : null);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [snapshot, videoRef]);

  const statusClass = !snapshot
    ? 'sales-face-live-pending'
    : !snapshot.supported
      ? 'sales-face-live-pending'
      : snapshot.detected
        ? 'sales-face-live-ok'
        : 'sales-face-live-danger';
  const statusText = !snapshot
    ? 'Mendeteksi wajah...'
    : !snapshot.supported
      ? 'Memuat detektor...'
      : snapshot.detected
        ? `Wajah terdeteksi ${Math.round(snapshot.confidence * 100)}%`
        : 'Wajah belum terdeteksi';

  return (
    <div className="sales-face-live-overlay" aria-live="polite">
      {box && snapshot?.detected && (
        <div
          className="sales-face-live-box"
          style={{
            left: `${box.left}px`,
            top: `${box.top}px`,
            width: `${box.width}px`,
            height: `${box.height}px`,
          }}
        />
      )}
      <div className={`sales-face-live-status ${statusClass}`}>
        <ScanFace size={14} />
        <span>{statusText}</span>
      </div>
    </div>
  );
}
