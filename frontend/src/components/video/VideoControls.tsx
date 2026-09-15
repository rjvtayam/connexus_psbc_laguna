import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Circle, Square } from 'lucide-react';
import { RaiseHandButton } from '../controls/RaiseHandButton';
import { ReactionPicker } from '../controls/ReactionPicker';

interface VideoControlsProps {
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  isHandRaised: boolean;
  onToggleHand: () => void;
  onReact: (emoji: string) => void;
  audioDisabled?: boolean;
  videoDisabled?: boolean;
  screenShareDisabled?: boolean;
  handDisabled?: boolean;
  reactionDisabled?: boolean;
  isRecording?: boolean;
  recordingUploading?: boolean;
  recordingTime?: string;
  onToggleRecording?: () => void;
  recordingDisabled?: boolean;
}

export function VideoControls({
  isAudioMuted,
  isVideoOff,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  isHandRaised,
  onToggleHand,
  onReact,
  audioDisabled,
  videoDisabled,
  screenShareDisabled,
  handDisabled,
  reactionDisabled,
  isRecording,
  recordingUploading,
  recordingTime,
  onToggleRecording,
  recordingDisabled,
}: VideoControlsProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-1.5">
      <button
        onClick={onToggleAudio}
        disabled={audioDisabled}
        className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg transition-all duration-200 ${
          audioDisabled
            ? 'bg-gray-800 text-gray-600 border border-gray-700/30 cursor-not-allowed opacity-50'
            : isAudioMuted
              ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent'
        }`}
        title={audioDisabled ? 'Disabled during Live Portal' : isAudioMuted ? 'Unmute' : 'Mute'}
      >
        {isAudioMuted ? <MicOff size={14} /> : <Mic size={14} />}
      </button>

      <button
        onClick={onToggleVideo}
        disabled={videoDisabled}
        data-demo="btn-video"
        className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg transition-all duration-200 ${
          videoDisabled
            ? 'bg-gray-800 text-gray-600 border border-gray-700/30 cursor-not-allowed opacity-50'
            : isVideoOff
              ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent'
        }`}
        title={videoDisabled ? 'Disabled during Live Portal' : isVideoOff ? 'Turn on camera' : 'Turn off camera'}
      >
        {isVideoOff ? <VideoOff size={14} /> : <Video size={14} />}
      </button>

      <button
        onClick={onToggleScreenShare}
        disabled={screenShareDisabled}
        data-demo="btn-screen"
        className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg transition-all duration-200 ${
          screenShareDisabled
            ? 'bg-gray-800 text-gray-600 border border-gray-700/30 cursor-not-allowed opacity-50'
            : isScreenSharing
              ? 'bg-primary-500/20 border border-primary-500/40 text-primary-400 hover:bg-primary-500/30'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent'
        }`}
        title={screenShareDisabled ? 'Disabled during Live Portal' : isScreenSharing ? 'Stop sharing' : 'Share screen'}
      >
        {isScreenSharing ? <MonitorOff size={14} /> : <Monitor size={14} />}
      </button>

      {onToggleRecording && (
        <>
          <div className="w-px h-5 bg-gray-700/60 mx-0.5 hidden sm:block" />
          <button
            onClick={onToggleRecording}
            disabled={recordingDisabled || recordingUploading}
            className={`flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg transition-all duration-200 ${
              recordingDisabled
                ? 'bg-gray-800 text-gray-600 border border-gray-700/30 cursor-not-allowed opacity-50'
                : recordingUploading
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 cursor-wait'
                : isRecording
                ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent'
            }`}
            title={recordingDisabled ? 'Recording disabled' : recordingUploading ? 'Uploading...' : isRecording ? 'Stop Recording' : 'Start Recording'}
            data-demo="btn-record"
          >
            {recordingUploading ? (
              <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            ) : isRecording ? (
              <Square size={12} className="fill-current" />
            ) : (
              <Circle size={14} className="fill-red-500 text-red-500" />
            )}
            {recordingTime && (
              <span className="text-[11px] font-mono font-medium hidden sm:inline">{recordingTime}</span>
            )}
          </button>
        </>
      )}

      <div className="w-px h-5 bg-gray-700/60 mx-0.5 hidden sm:block" />

      <RaiseHandButton isRaised={isHandRaised} onToggle={onToggleHand} disabled={handDisabled} />
      <ReactionPicker onReact={onReact} disabled={reactionDisabled} />
    </div>
  );
}
