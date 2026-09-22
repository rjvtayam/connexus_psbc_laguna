import { useRef, useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePeerStore } from '../stores/peerStore';
import { useSessionStore } from '../stores/sessionStore';
import { getSocket } from './useSocket';
import { recordingsApi } from '../api/recordings.api';

export function useRecording(roomId: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const queryClient = useQueryClient();

  const startRecording = useCallback(async () => {
    try {
      const localStream = usePeerStore.getState().localStream;
      if (!localStream) {
        console.error('[Recording] No local stream available');
        return;
      }

      let combinedStream: MediaStream;

      const screenSharerSid = useSessionStore.getState().screenSharerSid;
      const mySid = getSocket()?.id;

      if (screenSharerSid === mySid) {
        const screenTrack = localStream.getVideoTracks()[0];
        const audioTracks = localStream.getAudioTracks().map((t) => t.clone());
        const tracks: MediaStreamTrack[] = [];
        if (screenTrack) tracks.push(screenTrack.clone());
        audioTracks.forEach((t) => tracks.push(t));
        combinedStream = new MediaStream(tracks);
      } else {
        try {
          // Build display media constraints with feature detection
          const videoConstraints: any = { cursor: 'never' };
          
          // Check for displaySurface support (Chrome 107+)
          if ('getDisplayMedia' in navigator.mediaDevices) {
            // Test if browser supports displaySurface
            try {
              // We can't easily test, so we'll use a fallback approach
              videoConstraints.displaySurface = 'browser';
            } catch {}
            
            // logicalSurface is Chrome-only, use conditional
            const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
            if (isChrome) {
              videoConstraints.logicalSurface = true;
            }
          }

          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: videoConstraints,
          });

          const tracks: MediaStreamTrack[] = [];
          const videoTracks = displayStream.getVideoTracks();
          videoTracks.forEach((t) => tracks.push(t));

          const audioTracks = displayStream.getAudioTracks();
          if (audioTracks.length > 0) {
            audioTracks.forEach((t) => tracks.push(t));
          } else {
            const micTracks = localStream.getAudioTracks().map((t) => t.clone());
            micTracks.forEach((t) => tracks.push(t));
          }

          combinedStream = new MediaStream(tracks);

          videoTracks[0]?.addEventListener('ended', () => {
            console.log('[Recording] Screen share ended by user');
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
          });
        } catch (screenErr) {
          console.warn('[Recording] Screen capture cancelled or denied, falling back to local stream:', screenErr);
          const tracks: MediaStreamTrack[] = [];
          const videoTracks = localStream.getVideoTracks();
          videoTracks.forEach((t) => tracks.push(t.clone()));
          const audioTracks = localStream.getAudioTracks();
          audioTracks.forEach((t) => tracks.push(t.clone()));
          combinedStream = new MediaStream(tracks);
        }
      }

      if (combinedStream.getTracks().length === 0) {
        console.error('[Recording] No tracks to record');
        return;
      }

      combinedStreamRef.current = combinedStream;

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onerror = (e) => {
        console.error('[Recording] MediaRecorder error:', e);
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        combinedStream.getTracks().forEach((t) => t.stop());
        combinedStreamRef.current = null;
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });

        if (blob.size === 0) {
          console.warn('[Recording] Empty blob — no data captured');
          setUploadError('No recording data captured');
          setUploading(false);
          combinedStream.getTracks().forEach((t) => t.stop());
          combinedStreamRef.current = null;
          return;
        }

        const duration = Math.floor((Date.now() - (startTimeRef.current?.getTime() || Date.now())) / 1000);
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: mimeType });

        setUploading(true);
        setUploadError(null);
        try {
          const now = new Date().toISOString();
          const startTime = startTimeRef.current?.toISOString() || now;
          await recordingsApi.upload(
            file,
            `Meeting Recording - ${new Date(startTime).toLocaleString()}`,
            `Recorded in room ${roomId}`,
            duration,
            roomId,
            startTime,
            now,
          );
          console.log('[Recording] Uploaded successfully');
          queryClient.invalidateQueries({ queryKey: ['recordings'] });
        } catch (err: any) {
          const msg = err?.response?.data?.detail || err?.message || 'Upload failed';
          console.error('[Recording] Upload failed:', msg);
          setUploadError(msg);
        } finally {
          setUploading(false);
        }

        combinedStream.getTracks().forEach((t) => t.stop());
        combinedStreamRef.current = null;
      };

      mediaRecorder.start(1000);
      startTimeRef.current = new Date();
      setIsRecording(true);
      setElapsedTime(0);
      setUploadError(null);

      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);

      console.log('[Recording] Started');
    } catch (err) {
      console.error('[Recording] Failed to start:', err);
    }
  }, [roomId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    console.log('[Recording] Stopped — uploading...');
  }, []);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (combinedStreamRef.current) {
        combinedStreamRef.current.getTracks().forEach((t) => t.stop());
        combinedStreamRef.current = null;
      }
    };
  }, []);

  return {
    isRecording,
    elapsedTime,
    uploading,
    uploadError,
    startRecording,
    stopRecording,
    formatTime,
  };
}
