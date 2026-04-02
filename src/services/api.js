import axios from 'axios';

const BASE = '/api';
const TOKEN_KEY = 'reposys:token';
const REFRESH_TOKEN_KEY = 'reposys:refresh-token';
const RAW_BACKEND_URL = process.env.REACT_APP_API_URL || '';
const BACKEND_PORT = process.env.REACT_APP_BACKEND_PORT || '3001';

function getBackendUrl() {
  if (RAW_BACKEND_URL) {
    return RAW_BACKEND_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }

  if (typeof window === 'undefined') {
    return '';
  }

  const { protocol, hostname, port } = window.location;

  if (port === BACKEND_PORT) {
    return window.location.origin;
  }

  return `${protocol}//${hostname}:${BACKEND_PORT}`;
}

export const BACKEND_URL = getBackendUrl();

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token) => localStorage.setItem(REFRESH_TOKEN_KEY, token),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

const client = axios.create({ baseURL: BASE });
const refreshClient = axios.create({ baseURL: BASE });
let refreshPromise = null;

client.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function refreshSession() {
  const refreshToken = authStorage.getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  const response = await refreshClient.post('/auth/refresh', { refreshToken });
  authStorage.setToken(response.data.token);
  authStorage.setRefreshToken(response.data.refreshToken);
  return response.data;
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    if (status !== 401 || !originalRequest || originalRequest._retry) {
      throw error;
    }

    if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
      throw error;
    }

    originalRequest._retry = true;

    try {
      refreshPromise = refreshPromise || refreshSession();
      await refreshPromise;
      return client(originalRequest);
    } catch (refreshError) {
      authStorage.clear();
      throw refreshError;
    } finally {
      refreshPromise = null;
    }
  }
);

export const api = {
  login: (credentials) => client.post('/auth/login', credentials).then((r) => r.data),
  me: () => client.get('/auth/me').then((r) => r.data),
  logout: () => refreshClient.post('/auth/logout', { refreshToken: authStorage.getRefreshToken() }).then((r) => r.data),
  getAll: (params = {}) => client.get('/reposicoes', { params }).then((r) => r.data),
  getOne: (id) => client.get(`/reposicoes/${id}`).then((r) => r.data),
  create: (data) => client.post('/reposicoes', data).then((r) => r.data),
  update: (id, data) => client.put(`/reposicoes/${id}`, data).then((r) => r.data),
  remove: (id) => client.delete(`/reposicoes/${id}`).then((r) => r.data),
  getStats: () => client.get('/stats').then((r) => r.data),
  getActivity: () => client.get('/activity').then((r) => r.data),
  getUsers: () => client.get('/users').then((r) => r.data),
  createUser: (data) => client.post('/users', data).then((r) => r.data),
  updateUser: (id, data) => client.put(`/users/${id}`, data).then((r) => r.data),
  getNotes: (params = {}) => client.get('/notes', { params }).then((r) => r.data),
  createNote: (data) => client.post('/notes', data).then((r) => r.data),
  updateNote: (id, data) => client.put(`/notes/${id}`, data).then((r) => r.data),
  removeNote: (id) => client.delete(`/notes/${id}`).then((r) => r.data),
};

export function getErrorMessage(error, fallback = 'Ocorreu um erro inesperado.') {
  return error?.response?.data?.error || fallback;
}

export function canManageReposicoes(role) {
  return role === 'admin' || role === 'manager';
}

export function canDeleteReposicoes(role) {
  return role === 'admin';
}

export function canManageUsers(role) {
  return role === 'admin';
}

export const ROLE_LABELS = {
  admin: 'Administrador',
  manager: 'Gestor',
  viewer: 'Consulta',
};

export const STATUS_CONFIG = {
  SIM: { label: 'Confirmado', color: '#06D6A0', bg: 'rgba(6,214,160,0.12)' },
  FEITO: { label: 'Concluído', color: '#1E6BC4', bg: 'rgba(30,107,196,0.15)' },
  PENDENTE: { label: 'Pendente', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
};

export const CATEGORIA_CONFIG = {
  'COMPLEMENTAÇÃO': { color: '#60A5FA' },
  'TEM DOCUMENTO': { color: '#34D399' },
  AGUARDANDO: { color: '#F59E0B' },
  'AGUARDANDO DOC': { color: '#FB923C' },
  ESCALA: { color: '#A78BFA' },
  'NÃO CONTATAR': { color: '#EF4444' },
  GERAL: { color: '#94A3B8' },
};

export const DIAS = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];

const DIAS_POR_INDICE = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];

export function isValidDia(dia) {
  return DIAS.includes(dia);
}

function formatDateLabel(dateValue) {
  const [year, month, day] = String(dateValue).split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}`;
}

export function inferDiaFromDateValue(dateValue) {
  if (!dateValue) return '';
  const parsed = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return DIAS_POR_INDICE[parsed.getDay()] || '';
}

export function extractScheduleFields(horario = '') {
  const raw = String(horario || '').trim();
  if (!raw) return { date: '', time: '', details: '' };

  let date = '';
  let time = '';
  let details = raw;

  const isoMatch = raw.match(/(\d{4}-\d{2}-\d{2})/);
  const brMatch = raw.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
  const timeMatch = raw.match(/(\d{1,2})(?::(\d{2}))?\s*h\b|(\d{1,2}):(\d{2})/i);

  if (isoMatch) {
    date = isoMatch[1];
    details = details.replace(isoMatch[0], '').trim();
  } else if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3] || String(new Date().getFullYear());
    date = `${year}-${month}-${day}`;
    details = details.replace(brMatch[0], '').trim();
  }

  if (timeMatch) {
    const hour = (timeMatch[1] || timeMatch[3] || '').padStart(2, '0');
    const minute = (timeMatch[2] || timeMatch[4] || '00').padStart(2, '0');
    time = `${hour}:${minute}`;
    details = details.replace(timeMatch[0], '').trim();
  }

  details = details.replace(/^[\s,.-]+|[\s,.-]+$/g, '').trim();

  return { date, time, details };
}

export function buildHorarioLabel({ date = '', time = '', details = '' }) {
  const parts = [];
  if (date) parts.push(formatDateLabel(date));
  if (time) parts.push(time);
  if (details) parts.push(details.trim());
  return parts.join(' • ').trim();
}

export function resolveDia(dia, horario = '') {
  if (isValidDia(dia)) return dia;
  const extracted = extractScheduleFields(horario);
  const inferred = inferDiaFromDateValue(extracted.date);
  if (isValidDia(inferred)) return inferred;
  return 'SEGUNDA';
}

export function normalizeDiaLabel(dia, horario = '') {
  return resolveDia(dia, horario);
}

export default client;
