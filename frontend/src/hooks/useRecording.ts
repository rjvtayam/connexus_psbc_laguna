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
  const [starting, setStarting] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const startingRef = useRef(false);
  const uploadingRef = useRef(false);
  const beforeUnloadRef = useRef<((e: BeforeUnloadEvent) => void) | null>(null);
  const queryClient = useQueryClient();

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const removeBeforeUnload = () => {
    if (beforeUnloadRef.current) {
      window.removeEventListener('beforeunload', beforeUnloadRef.current);
      beforeUnloadRef.current = null;
    }
  };

  const closeAudioCtx = () => {
    const ctx = audioCtxRef.current;
    audioCtxRef.current = null;
    if (ctx && ctx.state !== 'closed') {
      ctx.close().catch(() => {});
    }
  };

  // Mix everything the admin broadcasts (mic) and hears (remote campus audio)
  // into a single track so recordings contain the other side of the conversation.
  const buildAudioMix = async (): Promise<MediaStreamTrack[]> => {
    const localStream = usePeerStore.getState().localStream;
    const AudioCtxCtor: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtxCtor) {
      return localStream ? localStream.getAudioTracks().map((t) => t.clone()) : [];
    }

    try {
      const ctx = new AudioCtxCtor();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') {
        await ctx.resume().catch((err) => console.warn('[Recording] AudioContext resume failed:', err));
      }
      console.log(`[Recording] AudioContext state=${ctx.state}`);
      const dest = ctx.createMediaStreamDestination();

      let micSources = 0;
      localStream?.getAudioTracks().forEach((track) => {
        try {
          ctx.createMediaStreamSource(new MediaStream([track])).connect(dest);
          micSources += 1;
        } catch {
          /* skip individual source failures */
        }
      });

      const mySid = getSocket()?.id;
      let remoteSources = 0;
      useSessionStore.getState().roomUsers.forEach((roomUser) => {
        if (roomUser.sid === mySid) return;
        roomUser.stream?.getAudioTracks().forEach((track) => {
          try {
            ctx.createMediaStreamSource(new MediaStream([track])).connect(dest);
            remoteSources += 1;
          } catch {
            /* skip individual source failures */
          }
        });
      });
      console.log(
        `[Recording] Audio mix ready: mic=${micSources} remote=${remoteSources} ctx=${ctx.state}`,
      );

      if (micSources + remoteSources === 0) {
        // A destination with no connected source stalls MediaRecorder entirely
        console.warn('[Recording] No audio sources connected — recording without audio');
        closeAudioCtx();
        return [];
      }

      return dest.stream.getAudioTracks();
    } catch (err) {
      console.warn('[Recording] Audio mix unavailable, falling back to microphone only:', err);
      closeAudioCtx();
      return localStream ? localStream.getAudioTracks().map((t) => t.clone()) : [];
    }
  };

  const startRecording = useCallback(async () => {
    if (startingRef.current || uploadingRef.current) return;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') return;
    startingRef.current = true;
    setStarting(true);
    try {
      const localStream = usePeerStore.getState().localStream;
      if (!localStream) {
        console.error('[Recording] No local stream available');
        return;
      }

      const isSelfSharing = useSessionStore.getState().screenSharerSid === getSocket()?.id;
      const sharedTrack = usePeerStore.getState().screenStream?.getVideoTracks()[0] ?? null;
      let videoTracks: MediaStreamTrack[] = [];

      if (isSelfSharing && sharedTrack) {
        // Recording the presentation we are sharing — clone so cleanup never kills the live share
        console.log(
          `[Recording] Sharer branch: src=${sharedTrack.readyState} en=${sharedTrack.enabled} muted=${sharedTrack.muted}`,
        );
        videoTracks = [sharedTrack.clone()];
      } else {
        try {
          const displayConstraints: any = { video: { cursor: 'never' } };
          const displayStream = await navigator.mediaDevices.getDisplayMedia(displayConstraints);
          videoTracks = displayStream.getVideoTracks();
        } catch (screenErr) {
          console.warn('[Recording] Screen capture cancelled or denied, falling back to camera:', screenErr);
          videoTracks = localStream.getVideoTracks().map((t) => t.clone());
        }
      }

      const audioTracks = await buildAudioMix();
      const combinedStream = new MediaStream([...videoTracks, ...audioTracks]);

      if (combinedStream.getTracks().length === 0) {
        console.error('[Recording] No tracks to record');
        combinedStream.getTracks().forEach((t) => t.stop());
        closeAudioCtx();
        return;
      }

      combinedStreamRef.current = combinedStream;
      console.log(
        `[Recording] Combined tracks: ${combinedStream
          .getTracks()
          .map((t) => `${t.kind}:${t.readyState}:en=${t.enabled}:muted=${t.muted}`)
          .join(' | ')}`,
      );

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        console.log(`[Recording] dataavailable size=${e.data.size}`);
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onerror = (e) => {
        console.error('[Recording] MediaRecorder error:', e);
        // Salvage whatever was captured instead of dropping it
        try {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            setIsRecording(false);
            clearTimer();
            return;
          }
        } catch {
          /* fall through to manual cleanup */
        }
        removeBeforeUnload();
        if (combinedStreamRef.current) {
          combinedStreamRef.current.getTracks().forEach((t) => t.stop());
          combinedStreamRef.current = null;
        }
        closeAudioCtx();
        setIsRecording(false);
        clearTimer();
      };

      mediaRecorder.onstop = async () => {
        removeBeforeUnload();
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const chunkCount = chunksRef.current.length;
        chunksRef.current = [];
        console.log(`[Recording] Captured ${blob.size} bytes in ${chunkCount} chunks (${mimeType})`);

        if (blob.size === 0) {
          console.warn('[Recording] Empty blob — no data captured');
          setUploadError('No recording data captured');
          setUploading(false);
          uploadingRef.current = false;
          if (combinedStreamRef.current) {
            combinedStreamRef.current.getTracks().forEach((t) => t.stop());
            combinedStreamRef.current = null;
          }
          closeAudioCtx();
          return;
        }

        const duration = Math.floor((Date.now() - (startTimeRef.current?.getTime() || Date.now())) / 1000);
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: mimeType });

        setUploading(true);
        uploadingRef.current = true;
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
          uploadingRef.current = false;
        }

        if (combinedStreamRef.current) {
          combinedStreamRef.current.getTracks().forEach((t) => t.stop());
          combinedStreamRef.current = null;
        }
        closeAudioCtx();
      };

      mediaRecorder.start(1000);
      startTimeRef.current = new Date();
      setIsRecording(true);
      setElapsedTime(0);
      setUploadError(null);

      const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      beforeUnloadRef.current = beforeUnloadHandler;
      window.addEventListener('beforeunload', beforeUnloadHandler);

      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);

      console.log('[Recording] Started');
    } catch (err) {
      console.error('[Recording] Failed to start:', err);
      setUploadError(err instanceof Error ? err.message : 'Failed to start recording');
      if (combinedStreamRef.current) {
        combinedStreamRef.current.getTracks().forEach((t) => t.stop());
        combinedStreamRef.current = null;
      }
      closeAudioCtx();
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }, [roomId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      removeBeforeUnload();
    }
    setIsRecording(false);
    clearTimer();
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
      clearTimer();
      removeBeforeUnload();
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        // onstop finalizes the upload and cleans up tracks/audio context
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
        return;
      }
      if (combinedStreamRef.current) {
        combinedStreamRef.current.getTracks().forEach((t) => t.stop());
        combinedStreamRef.current = null;
      }
      closeAudioCtx();
    };
  }, []);

  return {
    isRecording,
    elapsedTime,
    uploading,
    uploadError,
    starting,
    startRecording,
    stopRecording,
    formatTime,
  };
}
