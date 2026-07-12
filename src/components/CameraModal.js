import { useState, useEffect, useRef } from 'react';
import { Camera, Video, Square, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import './CameraModal.css';

export default function CameraModal({ isOpen, onClose, onCapture, mode = 'photo' }) {
  const [stream, setStream]         = useState(null);
  const [recording, setRecording]   = useState(false);
  const [seconds, setSeconds]       = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [capturedFile, setCaptured] = useState(null);
  const [loading, setLoading]       = useState(false);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      resetState();
    }
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, mode]);

  const startCamera = async () => {
    try {
      const constraints = {
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: mode === 'video'
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      toast.error('Could not access camera. Please check permissions.');
      onClose();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const resetState = () => {
    setRecording(false);
    setSeconds(0);
    setPreviewUrl(null);
    setCaptured(null);
    setLoading(false);
    chunksRef.current = [];
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Draw mirrored image if facing user
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setCaptured(file);
        setPreviewUrl(URL.createObjectURL(blob));
        stopCamera();
      }
    }, 'image/jpeg', 0.95);
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    
    let options = { mimeType: 'video/webm;codecs=vp9' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm' };
    }
    
    const mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
      const file = new File([blob], `record-${Date.now()}.mp4`, { type: 'video/mp4' });
      setCaptured(file);
      setPreviewUrl(URL.createObjectURL(blob));
    };

    mediaRecorder.start();
    setRecording(true);
    setSeconds(0);

    timerRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev >= 15) { // Max 15s for stories/reels
          stopRecording();
          return 15;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      stopCamera();
    }
  };

  const handleSubmit = async () => {
    if (!capturedFile) return;
    setLoading(true);
    try {
      await onCapture(capturedFile);
      onClose();
    } catch {
      toast.error('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="camera-overlay">
      <div className="camera-modal card">
        <div className="camera-header">
          <h3>{mode === 'photo' ? 'Capture Photo' : 'Record Video'}</h3>
          <button onClick={onClose} className="close-btn" disabled={loading}><X size={20} /></button>
        </div>

        <div className="camera-viewport-container">
          {!previewUrl ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-video-stream"
              style={{ transform: 'scaleX(-1)' }} // Mirror view for user
            />
          ) : (
            mode === 'photo' ? (
              <img src={previewUrl} alt="Preview" className="camera-preview" />
            ) : (
              <video src={previewUrl} controls autoPlay className="camera-preview" />
            )
          )}

          {recording && (
            <div className="camera-timer">
              <div className="pulse-dot" />
              <span>00:{seconds < 10 ? `0${seconds}` : seconds} / 00:15</span>
            </div>
          )}
        </div>

        <div className="camera-controls">
          {!previewUrl ? (
            mode === 'photo' ? (
              <button onClick={capturePhoto} className="capture-btn">
                <Camera size={24} /> Capture
              </button>
            ) : (
              !recording ? (
                <button onClick={startRecording} className="record-btn-start">
                  <Video size={24} /> Record (Max 15s)
                </button>
              ) : (
                <button onClick={stopRecording} className="record-btn-stop">
                  <Square size={24} /> Stop
                </button>
              )
            )
          ) : (
            <div className="camera-action-buttons">
              <button onClick={() => { resetState(); startCamera(); }} className="btn-outline" disabled={loading}>
                <RefreshCw size={15} /> Retake
              </button>
              <button onClick={handleSubmit} className="btn-primary" disabled={loading}>
                {loading ? 'Uploading…' : 'Share Now'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
