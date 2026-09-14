import { useEffect, useRef } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { usePeerStore } from '../stores/peerStore';

export function useSettingsSync() {
  const prevAudioRef = useRef({ echoCancellation: true, noiseSuppression: true, autoGainControl: true, hdAudio: true });
  const prevVideoRef = useRef({ hdVideo: true, lowLatency: true });
  const prevDeviceRef = useRef({ selectedCameraId: '', selectedMicId: '' });

  const echoCancellation = useSettingsStore((s) => s.echoCancellation);
  const noiseSuppression = useSettingsStore((s) => s.noiseSuppression);
  const autoGainControl = useSettingsStore((s) => s.autoGainControl);
  const hdAudio = useSettingsStore((s) => s.hdAudio);
  const hdVideo = useSettingsStore((s) => s.hdVideo);
  const lowLatency = useSettingsStore((s) => s.lowLatency);
  const selectedCameraId = useSettingsStore((s) => s.selectedCameraId);
  const selectedMicId = useSettingsStore((s) => s.selectedMicId);

  useEffect(() => {
    const prev = prevAudioRef.current;
    if (
      prev.echoCancellation !== echoCancellation ||
      prev.noiseSuppression !== noiseSuppression ||
      prev.autoGainControl !== autoGainControl ||
      prev.hdAudio !== hdAudio
    ) {
      prevAudioRef.current = { echoCancellation, noiseSuppression, autoGainControl, hdAudio };
      const localStream = usePeerStore.getState().localStream;
      if (localStream) {
        usePeerStore.getState().applyAudioSettings();
        console.log('[SettingsSync] Audio constraints applied in real-time, HD Audio:', hdAudio);
      }
    }
  }, [echoCancellation, noiseSuppression, autoGainControl, hdAudio]);

  useEffect(() => {
    const prev = prevVideoRef.current;
    if (prev.hdVideo !== hdVideo || prev.lowLatency !== lowLatency) {
      prevVideoRef.current = { hdVideo, lowLatency };
      const localStream = usePeerStore.getState().localStream;
      if (localStream && localStream.getVideoTracks().length > 0) {
        const videoConstraints = useSettingsStore.getState().getVideoConstraints();
        navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false })
          .then((newStream) => {
            usePeerStore.getState().replaceVideoStream(newStream);
            console.log('[SettingsSync] Video constraints applied in real-time, HD:', hdVideo, 'lowLatency:', lowLatency);
          })
          .catch((err) => {
            console.error('[SettingsSync] Failed to re-acquire video stream:', err);
          });
      }
    }
  }, [hdVideo, lowLatency]);

  useEffect(() => {
    const prev = prevDeviceRef.current;
    if (prev.selectedCameraId !== selectedCameraId) {
      prevDeviceRef.current = { ...prevDeviceRef.current, selectedCameraId };
      const localStream = usePeerStore.getState().localStream;
      if (localStream && localStream.getVideoTracks().length > 0) {
        usePeerStore.getState().switchCamera(selectedCameraId);
        console.log('[SettingsSync] Camera device switched:', selectedCameraId || 'default');
      }
    }
  }, [selectedCameraId]);

  useEffect(() => {
    const prev = prevDeviceRef.current;
    if (prev.selectedMicId !== selectedMicId) {
      prevDeviceRef.current = { ...prevDeviceRef.current, selectedMicId };
      const localStream = usePeerStore.getState().localStream;
      if (localStream && localStream.getAudioTracks().length > 0) {
        usePeerStore.getState().switchMicrophone(selectedMicId);
        console.log('[SettingsSync] Microphone device switched:', selectedMicId || 'default');
      }
    }
  }, [selectedMicId]);
}
