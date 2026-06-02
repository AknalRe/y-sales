import { useEffect, useRef, useState } from 'react';
import { Camera, ImageUp, RefreshCw, RotateCcw, VideoOff } from 'lucide-react';

type FaceCaptureFieldProps = {
  id: string;
  preview: string;
  targetName: string;
  onCapture: (file?: File | null) => void | Promise<void>;
};

export function FaceCaptureField({ id, preview, targetName, onCapture }: FaceCaptureFieldProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Browser tidak mendukung akses kamera. Gunakan opsi galeri.');
      return;
    }

    setCameraLoading(true);
    setCameraError('');
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      setCameraError('Kamera tidak bisa dibuka. Periksa izin kamera atau gunakan galeri.');
    } finally {
      setCameraLoading(false);
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !cameraReady) return;

    const width = video.videoWidth || 720;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (!blob) return;

    const file = new File([blob], `face-template-${Date.now()}.jpg`, { type: 'image/jpeg' });
    await onCapture(file);
    stopCamera();
  }

  async function handleFile(file?: File | null) {
    stopCamera();
    await onCapture(file);
  }

  useEffect(() => {
    if (!preview) void startCamera();
    return stopCamera;
  }, []);

  return (
    <div className="admin-face-capture">
      <div className="admin-face-capture-frame">
        {preview ? (
          <img src={preview} alt={`Preview wajah ${targetName}`} />
        ) : (
          <>
            <video ref={videoRef} playsInline muted />
            {!cameraReady ? (
              <div className="admin-face-capture-empty">
                {cameraLoading ? <RefreshCw size={30} className="spin" /> : cameraError ? <VideoOff size={32} /> : <Camera size={34} />}
                <strong>{cameraLoading ? 'Membuka kamera...' : cameraError ? 'Kamera belum aktif' : 'Kamera wajah'}</strong>
                <span>{cameraError || 'Posisikan wajah di tengah frame, lalu ambil foto.'}</span>
              </div>
            ) : (
              <div className="admin-face-capture-guide" aria-hidden="true" />
            )}
          </>
        )}
      </div>

      <div className="admin-face-capture-actions">
        {preview ? (
          <button type="button" className="admin-btn-ghost" onClick={() => { void onCapture(null); void startCamera(); }}>
            <RotateCcw size={14} />
            Ulangi Foto
          </button>
        ) : (
          <button type="button" className="admin-btn-primary" onClick={() => void capturePhoto()} disabled={!cameraReady}>
            <Camera size={14} />
            Ambil Foto
          </button>
        )}

        <label className="admin-face-capture-file" htmlFor={id}>
          <ImageUp size={14} />
          Pilih dari Galeri
        </label>
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </div>

      <p className="admin-face-capture-hint">
        Kamera diprioritaskan untuk membuat template wajah lebih valid. Opsi galeri hanya cadangan jika perangkat tidak memberi akses kamera.
      </p>
    </div>
  );
}
