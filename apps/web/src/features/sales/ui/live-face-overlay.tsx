import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
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

  return {
    left: offsetX + snapshot.box.x * scale,
    top: offsetY + snapshot.box.y * scale,
    width: snapshot.box.width * scale,
    height: snapshot.box.height * scale,
  };
}

export function LiveFaceOverlay({ videoRef, stream }: LiveFaceOverlayProps) {
  const [snapshot, setSnapshot] = useState<FaceDetectionSnapshot | null>(null);
  const [version, setVersion] = useState(0);
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
        const nextSnapshot = await detectFaceFromVideo(videoRef.current);
        if (!cancelled) setSnapshot(nextSnapshot);
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
    const onResize = () => setVersion((current) => current + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const box = useMemo(() => {
    version;
    return videoRef.current ? getOverlayBox(videoRef.current, snapshot) : null;
  }, [snapshot, videoRef, version]);

  const statusClass = !snapshot
    ? 'sales-face-live-pending'
    : !snapshot.supported
      ? 'sales-face-live-warning'
      : snapshot.detected
        ? 'sales-face-live-ok'
        : 'sales-face-live-danger';
  const statusText = !snapshot
    ? 'Mendeteksi wajah...'
    : !snapshot.supported
      ? 'Live detector tidak didukung'
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
