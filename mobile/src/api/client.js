/**
 * ICON Mobile — API Client
 * Mirrors web/src/api/client.js but uses axios for React Native.
 *
 * Backend URL:
 *   - Android emulator  → http://10.0.2.2:8000
 *   - Physical device   → http://<YOUR_PC_IP>:8000  (e.g. http://192.168.1.5:8000)
 *   - Change API_BASE_URL below to match your setup.
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ── CHANGE THIS to your PC's local IP when testing on a physical device ────────
//export const API_BASE_URL = 'http://10.0.2.2:8000/api/v1';
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://10.0.2.2:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Inject JWT token on every request
apiClient.interceptors.request.use(async (config) => {
  try {
    const userStr = await SecureStore.getItemAsync('icon_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.token) {
        config.headers['Authorization'] = `Bearer ${user.token}`;
      }
    }
  } catch (_) {}
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = async (username, password) => {
  const res = await apiClient.post('/auth/login', { username, password });
  return res.data;
};

export const getMe = async () => {
  const res = await apiClient.get('/auth/me');
  return res.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const res = await apiClient.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return res.data;
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getProjectStats = async () => {
  const res = await apiClient.get('/dashboard/stats');
  return res.data;
};

export const getRoleKpis = async (role, userId) => {
  const params = new URLSearchParams({ role: role || '' });
  if (userId) params.append('user_id', userId);
  const res = await apiClient.get(`/dashboard/role-kpis?${params.toString()}`);
  return res.data;
};

// ── Projects ──────────────────────────────────────────────────────────────────
export const getProjects = async (params = {}) => {
  const res = await apiClient.get('/projects/', { params });
  return res.data;
};

export const getProjectById = async (id) => {
  const res = await apiClient.get(`/projects/${id}`);
  return res.data;
};

export const createProject = async (data) => {
  const res = await apiClient.post('/projects/', data);
  return res.data;
};

export const updateProject = async (id, data) => {
  const res = await apiClient.put(`/projects/${id}`, data);
  return res.data;
};

export const updateProjectStage = async (id, stageName) => {
  const res = await apiClient.put(`/projects/${id}/stage?stage_name=${encodeURIComponent(stageName)}`);
  return res.data;
};

// ── Farmers ───────────────────────────────────────────────────────────────────
export const getFarmers = async (params = {}) => {
  const res = await apiClient.get('/farmers/', { params });
  return res.data;
};

export const getFarmerById = async (id) => {
  const res = await apiClient.get(`/farmers/${id}`);
  return res.data;
};

export const registerFarmer = async (data) => {
  const res = await apiClient.post('/farmers/register', data);
  return res.data;
};

export const updateFarmer = async (id, data) => {
  const res = await apiClient.put(`/farmers/${id}`, data);
  return res.data;
};

export const getDealerFarmers = async (dealerId) => {
  const res = await apiClient.get(`/dealers/${dealerId}/farmers`);
  return res.data;
};

// ── Documents ─────────────────────────────────────────────────────────────────
export const getProjectDocuments = async (projectId) => {
  const res = await apiClient.get(`/uploads/project/${projectId}`);
  return res.data;
};

export const uploadDocument = async (projectId, formData) => {
  const res = await apiClient.post(`/uploads/project/${projectId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const verifyDocument = async (docId) => {
  const res = await apiClient.patch(`/uploads/${docId}/verify`);
  return res.data;
};

export const deleteDocument = async (docId) => {
  const res = await apiClient.delete(`/uploads/${docId}`);
  return res.data;
};

// ── Lookups ───────────────────────────────────────────────────────────────────
export const getAreaTypes = async () => {
  const res = await apiClient.get('/lookups/area-types');
  return res.data;
};

export const getStates = async () => {
  const res = await apiClient.get('/lookups/states');
  return res.data;
};

export const getDistricts = async (stateId) => {
  const res = await apiClient.get('/lookups/districts', { params: { state_id: stateId } });
  return res.data;
};

export const getTalukas = async (districtId) => {
  const res = await apiClient.get('/lookups/talukas', { params: { district_id: districtId } });
  return res.data;
};

export const getVillages = async (talukaId) => {
  const res = await apiClient.get('/lookups/villages', { params: { taluka_id: talukaId } });
  return res.data;
};

export const getComponents = async (type = null) => {
  const params = type ? { component_type: type } : {};
  const res = await apiClient.get('/structures/', { params });
  return res.data;
};

export const getDocumentTypes = async (params = {}) => {
  const res = await apiClient.get('/uploads/types', { params });
  return res.data;
};

export const getAgencies = async () => {
  const res = await apiClient.get('/lookups/agencies');
  return res.data;
};

export const getBanks = async () => {
  const res = await apiClient.get('/banks/');
  return res.data;
};

export const getBankBranches = async (bankId) => {
  const res = await apiClient.get('/banks/branches', { params: { bank_id: bankId } });
  return res.data;
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const getMyNotifications = async () => {
  const res = await apiClient.get('/notifications/my');
  return res.data;
};

export const getUnreadCount = async () => {
  const res = await apiClient.get('/notifications/unread-count');
  return res.data;
};

export const markNotificationRead = async (id) => {
  const res = await apiClient.put(`/notifications/${id}/read`);
  return res.data;
};

export default apiClient;
