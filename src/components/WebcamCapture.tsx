import { useEffect, useRef, useState } from "react";

type WebcamCaptureProps = {
  onCapture: (file: File) => void;
  disabled?: boolean;
};

export function WebcamCapture({ onCapture, disabled }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (disabled) {
      stopStream();
      return;
    }
    void startStream();
    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  const startStream = async () => {
    if (stream || disabled) return;
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      setStream(nextStream);
      if (videoRef.current) {
        videoRef.current.srcObject = nextStream;
        await videoRef.current.play();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to access webcam");
    }
  };

  const stopStream = () => {
    setError(null);
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  };

  const captureFrame = async () => {
    if (!videoRef.current) return;
    const { videoWidth, videoHeight } = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
    if (!blob) return;
    const file = new File([blob], `webcam_${Date.now()}.jpg`, { type: "image/jpeg" });
    onCapture(file);
  };

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border bg-black/60">
        <video ref={videoRef} muted playsInline autoPlay className="h-64 w-full object-cover" />
        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            {error ? error : "Waiting for webcam..."}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={stream ? stopStream : startStream}
          className="rounded-lg border bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted"
        >
          {stream ? "Stop" : "Start"} webcam
        </button>
        <button
          type="button"
          onClick={captureFrame}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          disabled={!stream}
        >
          Capture frame
        </button>
      </div>
    </div>
  );
}
