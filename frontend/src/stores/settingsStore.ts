import { create } from 'zustand';

export interface SettingsState {
  hdVideo: boolean;
  mirrorVideo: boolean;
  hdAudio: boolean;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  autoReconnect: boolean;
  lowLatency: boolean;
  notifications: boolean;
  darkMode: boolean;
  selectedCameraId: string;
  selectedMicId: string;
  selectedSpeakerId: string;
  setHdVideo: (v: boolean) => void;
  setMirrorVideo: (v: boolean) => void;
  setHdAudio: (v: boolean) => void;
  setEchoCancellation: (v: boolean) => void;
  setNoiseSuppression: (v: boolean) => void;
  setAutoGainControl: (v: boolean) => void;
  setAutoReconnect: (v: boolean) => void;
  setLowLatency: (v: boolean) => void;
  setNotifications: (v: boolean) => void;
  setDarkMode: (v: boolean) => void;
  setSelectedCameraId: (id: string) => void;
  setSelectedMicId: (id: string) => void;
  setSelectedSpeakerId: (id: string) => void;
  loadSettings: () => void;
  resetSettings: () => void;
  saveSettings: () => void;
  getVideoConstraints: () => MediaTrackConstraints;
  getAudioConstraints: () => MediaTrackConstraints;
}

function loadFromStorage(): Partial<SettingsState> {
  try {
    const raw = localStorage.getItem('ht-settings');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStorage(state: SettingsState) {
  const { loadSettings, saveSettings, getVideoConstraints, getAudioConstraints, ...data } = state;
  localStorage.setItem('ht-settings', JSON.stringify(data));
}

const defaults = {
  hdVideo: true,
  mirrorVideo: false,
  hdAudio: true,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: false,
  autoReconnect: true,
  lowLatency: true,
  notifications: true,
  darkMode: true,
  selectedCameraId: '',
  selectedMicId: '',
  selectedSpeakerId: '',
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaults,

  setHdVideo: (v) => { set({ hdVideo: v }); setTimeout(() => saveToStorage(get()), 0); },
  setMirrorVideo: (v) => { set({ mirrorVideo: v }); setTimeout(() => saveToStorage(get()), 0); },
  setHdAudio: (v) => { set({ hdAudio: v }); setTimeout(() => saveToStorage(get()), 0); },
  setEchoCancellation: (v) => { set({ echoCancellation: v }); setTimeout(() => saveToStorage(get()), 0); },
  setNoiseSuppression: (v) => { set({ noiseSuppression: v }); setTimeout(() => saveToStorage(get()), 0); },
  setAutoGainControl: (v) => { set({ autoGainControl: v }); setTimeout(() => saveToStorage(get()), 0); },
  setAutoReconnect: (v) => { set({ autoReconnect: v }); setTimeout(() => saveToStorage(get()), 0); },
  setLowLatency: (v) => { set({ lowLatency: v }); setTimeout(() => saveToStorage(get()), 0); },
  setNotifications: (v) => { set({ notifications: v }); setTimeout(() => saveToStorage(get()), 0); },
  setDarkMode: (v) => {
    set({ darkMode: v });
    setTimeout(() => saveToStorage(get()), 0);
    if (v) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
  setSelectedCameraId: (id) => { set({ selectedCameraId: id }); setTimeout(() => saveToStorage(get()), 0); },
  setSelectedMicId: (id) => { set({ selectedMicId: id }); setTimeout(() => saveToStorage(get()), 0); },
  setSelectedSpeakerId: (id) => { set({ selectedSpeakerId: id }); setTimeout(() => saveToStorage(get()), 0); },

  loadSettings: () => {
    const saved = loadFromStorage();
    set({ ...defaults, ...saved });
    if (get().darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  resetSettings: () => {
    localStorage.removeItem('ht-settings');
    set({ ...defaults });
    if (defaults.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  saveSettings: () => {
    saveToStorage(get());
  },

  getVideoConstraints: () => {
    const { hdVideo, lowLatency, selectedCameraId } = get();
    const deviceConstraint: MediaTrackConstraints = selectedCameraId
      ? { deviceId: { exact: selectedCameraId } }
      : {};
    if (lowLatency) {
      return {
        ...deviceConstraint,
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15 },
      };
    }
    if (hdVideo) {
      return {
        ...deviceConstraint,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      };
    }
    return {
      ...deviceConstraint,
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 24 },
    };
  },

  getAudioConstraints: () => {
    const { hdAudio, echoCancellation, noiseSuppression, autoGainControl, lowLatency, selectedMicId } = get();
    const deviceConstraint: MediaTrackConstraints = selectedMicId
      ? { deviceId: { exact: selectedMicId } }
      : {};
    return {
      ...deviceConstraint,
      sampleRate: lowLatency ? { ideal: 16000 } : hdAudio ? { ideal: 48000 } : { ideal: 16000 },
      echoCancellation,
      noiseSuppression,
      autoGainControl,
    };
  },
}));
