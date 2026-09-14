export const API_BASE_URL = '/api/v1';

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  || (window.location.hostname === 'localhost'
    ? `http://${window.location.hostname}:8000`
    : window.location.origin);

export const ROOMS = {
  MAIN: 'main-session',
} as const;

export const CAMPUSES = {
  PAETE: 'paete',
  PAGSANJAN: 'pagsanjan',
  CONTROL_ROOM: 'control_room',
} as const;

export const ROLES = {
  PRINCIPAL: 'principal',
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STAFF: 'staff',
} as const;
