import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Volume2, VolumeX, Mic, MicOff, RefreshCw, AudioLines, Speaker, Zap, CheckCircle2 } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { usePeerStore } from '../../stores/peerStore';

export function AudioSettings() {
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInput, setSelectedInput] = useState('');
  const [selectedOutput, setSelectedOutput] = useState('');
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [switching, setSwitching] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const storeSelectedMicId = useSettingsStore((s) => s.selectedMicId);
  const setSelectedMicId = useSettingsStore((s) => s.setSelectedMicId);
  const storeSelectedSpeakerId = useSettingsStore((s) => s.selectedSpeakerId);
  const setSelectedSpeakerId = useSettingsStore((s) => s.setSelectedSpeakerId);
  const localStream = usePeerStore((s) => s.localStream);
  const switchMicrophone = usePeerStore((s) => s.switchMicrophone);

  useEffect(() => {
    loadDevices();
    return () => {
      stopMicTest();
    };
  }, []);

  useEffect(() => {
    if (storeSelectedMicId) setSelectedInput(storeSelectedMicId);
    if (storeSelectedSpeakerId) setSelectedOutput(storeSelectedSpeakerId);
  }, [storeSelectedMicId, storeSelectedSpeakerId]);

  const loadDevices = async () => {
    setIsRefreshing(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((s) => s.getTracks().forEach((t) => t.stop()));
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const inputs = allDevices.filter((d) => d.kind === 'audioinput');
      const outputs = allDevices.filter((d) => d.kind === 'audiooutput');
      setInputDevices(inputs);
      setOutputDevices(outputs);
      if (inputs.length > 0 && !selectedInput) {
        setSelectedInput(storeSelectedMicId || inputs[0].deviceId);
      }
      if (outputs.length > 0 && !selectedOutput) {
        setSelectedOutput(storeSelectedSpeakerId || outputs[0].deviceId);
      }
    } catch (err) {
      console.error('Failed to enumerate audio devices:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const startMicTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedInput ? { deviceId: { exact: selectedInput } } : true,
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsTestingMic(true);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(avg / 128, 1));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.error('Mic test failed:', err);
    }
  };

  const stopMicTest = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setIsTestingMic(false);
    setMicLevel(0);
  };

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  const applyMicLive = async () => {
    if (!selectedInput || !localStream) return;
    setSwitching(true);
    try {
      await switchMicrophone(selectedInput);
      setSelectedMicId(selectedInput);
    } finally {
      setSwitching(false);
    }
  };

  const currentMicLabel = localStream?.getAudioTracks()[0]?.label || 'None';
  const isInRoom = !!localStream;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
            <AudioLines size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-white">Audio Settings</h1>
            <p className="text-gray-500 text-sm">Configure microphone and speaker devices</p>
          </div>
        </div>

        {isInRoom && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs">
            <Zap size={14} />
            <span>Live in room — changes apply immediately to your audio stream</span>
          </div>
        )}

        <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden">
          <div className="p-4 border-b border-gray-800/60 flex items-center gap-2">
            <Mic size={16} className="text-purple-400" />
            <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Microphone</span>
            {isTestingMic && (
              <span className="ml-auto flex items-center gap-1.5 text-[11px] text-green-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> TESTING
              </span>
            )}
          </div>
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Input Device</label>
              <select
                value={selectedInput}
                onChange={(e) => setSelectedInput(e.target.value)}
                className="w-full bg-gray-800/80 border border-gray-700/50 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 focus:outline-none transition-all"
              >
                {inputDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>
                ))}
                {inputDevices.length === 0 && <option value="">No microphones detected</option>}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Input Level</label>
              <div className="h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700/50">
                <div
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${micLevel * 100}%`,
                    background: micLevel > 0.8 ? 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)' : micLevel > 0.5 ? 'linear-gradient(90deg, #22c55e, #eab308)' : 'linear-gradient(90deg, #22c55e, #22d3ee)',
                    boxShadow: micLevel > 0 ? `0 0 10px ${micLevel > 0.8 ? 'rgba(239,68,68,0.4)' : micLevel > 0.5 ? 'rgba(234,179,8,0.4)' : 'rgba(34,197,94,0.4)'}` : 'none',
                  }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1.5">{isTestingMic ? `Level: ${Math.round(micLevel * 100)}%` : 'Click "Test Microphone" to start'}</p>
            </div>

            <div className="flex gap-3 flex-wrap">
              {!isTestingMic ? (
                <Button onClick={startMicTest} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
                  <Mic size={16} className="mr-2" />Test Microphone
                </Button>
              ) : (
                <Button variant="danger" onClick={stopMicTest}>
                  <MicOff size={16} className="mr-2" />Stop Test
                </Button>
              )}
              <Button variant="secondary" onClick={toggleMute} disabled={!isTestingMic}>
                {isMuted ? <VolumeX size={16} className="mr-2" /> : <Volume2 size={16} className="mr-2" />}
                {isMuted ? 'Unmute' : 'Mute'}
              </Button>
            </div>

            {isInRoom && selectedInput && selectedInput !== storeSelectedMicId && (
              <div className="pt-2 border-t border-gray-800/60">
                <Button onClick={applyMicLive} disabled={switching} size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
                  {switching ? <RefreshCw size={12} className="mr-1.5 animate-spin" /> : <Zap size={12} className="mr-1.5" />}
                  {switching ? 'Switching...' : 'Switch Live Microphone'}
                </Button>
              </div>
            )}
            {storeSelectedMicId && (
              <div className="flex items-center gap-1.5 text-[11px] text-green-400">
                <CheckCircle2 size={12} />
                Active: {currentMicLabel}
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/60 overflow-hidden">
          <div className="p-4 border-b border-gray-800/60 flex items-center gap-2">
            <Speaker size={16} className="text-cyan-400" />
            <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Speaker / Output</span>
          </div>
          <div className="p-5">
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Output Device</label>
            <select
              value={selectedOutput}
              onChange={(e) => {
                setSelectedOutput(e.target.value);
                setSelectedSpeakerId(e.target.value);
              }}
              className="w-full bg-gray-800/80 border border-gray-700/50 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 focus:outline-none transition-all"
            >
              {outputDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || 'Speaker'}</option>
              ))}
              {outputDevices.length === 0 && <option value="">No speakers detected</option>}
            </select>
            {storeSelectedSpeakerId && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-green-400">
                <CheckCircle2 size={12} />
                Output saved
              </div>
            )}
          </div>
        </div>

        <Button variant="ghost" onClick={loadDevices}>
          <RefreshCw size={16} className={`mr-2 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`} />Refresh Devices
        </Button>
      </div>
    </DashboardLayout>
  );
}
