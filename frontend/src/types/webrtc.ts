export interface PeerConnection {
  sid: string;
  user: string;
  campus: string;
  role: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

export interface RTCConfig {
  iceServers: RTCIceServer[];
}

function getStoredSettings() {
  try {
    const raw = localStorage.getItem('ht-settings');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function buildRTCConfig(): RTCConfig {
  const settings = getStoredSettings();
  const stunServer = settings.stunServer || 'stun:stun.l.google.com:19302';
  const turnServer = settings.turnServer;
  const turnUsername = settings.turnUsername;
  const turnCredential = settings.turnCredential;

  const iceServers: RTCIceServer[] = [
    { urls: stunServer },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  if (turnServer) {
    iceServers.push({
      urls: turnServer,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return { iceServers };
}

export const defaultRTCConfig = buildRTCConfig();
export { buildRTCConfig };