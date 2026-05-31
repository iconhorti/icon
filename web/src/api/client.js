import axios from 'axios';

// Use VITE_API_URL env var in production; fall back to the Vite dev-server proxy (/api → localhost:8000)
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// ── Inject JWT Bearer token on every request ──────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('icon_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.token) {
        config.headers['Authorization'] = `Bearer ${user.token}`;
      }
    } catch (e) {
      // Corrupted auth data — clear it so the user gets a clean login prompt
      console.warn('[ICON] Corrupted auth token in localStorage — clearing.', e);
      localStorage.removeItem('icon_user');
    }
  }
  return config;
});

// ── Global 401 handler — emit event for AuthContext to catch ────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('auth-error'));
    }
    return Promise.reject(error);
  }
);


// ─── Auth ─────────────────────────────────────────────────────────────────────
export const login = async (username, password) => {
  const response = await apiClient.post('/auth/login', { username, password });
  return response.data;
};

export const getMe = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await apiClient.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return response.data;
};


// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getProjectStats = async () => {
  const response = await apiClient.get('/dashboard/stats');
  return response.data;
};

export const getRoleKpis = async (role) => {
  const response = await apiClient.get(`/dashboard/role-kpis?role=${encodeURIComponent(role)}`);
  return response.data;
};


// ─── Projects ─────────────────────────────────────────────────────────────────
export const getProjects = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/projects/${query ? '?' + query : ''}`);
  return response.data;
};

export const getProjectById = async (id) => {
  const response = await apiClient.get(`/projects/${id}`);
  return response.data;
};

export const createProject = async (data) => {
  const response = await apiClient.post('/projects/', data);
  return response.data;
};

export const updateProject = async (id, data) => {
  const response = await apiClient.put(`/projects/${id}`, data);
  return response.data;
};

export const updateProjectStage = async (id, stageName) => {
  const response = await apiClient.put(
    `/projects/${id}/stage?stage_name=${encodeURIComponent(stageName)}`
  );
  return response.data;
};

export const updateProjectFields = async (id, fields) => {
  const response = await apiClient.patch(`/projects/${id}`, { updates: fields });
  return response.data;
};

export const deleteProject = async (id) => {
  const response = await apiClient.delete(`/projects/${id}`);
  return response.data;
};

export const addProjectItem = async (id, data) => {
  const response = await apiClient.post(`/projects/${id}/items`, data);
  return response.data;
};

export const getProjectItems = async (projectId) => {
  const response = await apiClient.get(`/projects/${projectId}/items`);
  return response.data;
};

export const deleteProjectItem = async (projectId, itemId) => {
  const response = await apiClient.delete(`/projects/${projectId}/items/${itemId}`);
  return response.data;
};

export const deleteAllProjectItems = async (projectId) => {
  const response = await apiClient.delete(`/projects/${projectId}/items`);
  return response.data;
};

// ─── Project Co-Applicants ─────────────────────────────────────────────────────
export const getProjectCoApplicants = async (projectId) => {
  const response = await apiClient.get(`/projects/${projectId}/co-applicants`);
  return response.data;
};

export const addProjectCoApplicant = async (projectId, farmerId) => {
  const response = await apiClient.post(`/projects/${projectId}/co-applicants`, { farmer_id: farmerId });
  return response.data;
};

export const removeProjectCoApplicant = async (projectId, farmerId) => {
  const response = await apiClient.delete(`/projects/${projectId}/co-applicants/${farmerId}`);
  return response.data;
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const getUsers = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/users/${query ? '?' + query : ''}`);
  return response.data;
};

export const getUserById = async (id) => {
  const response = await apiClient.get(`/users/${id}`);
  return response.data;
};

export const createUser = async (data) => {
  const response = await apiClient.post('/users/', data);
  return response.data;
};

export const updateUser = async (id, data) => {
  const response = await apiClient.put(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await apiClient.delete(`/users/${id}`);
  return response.data;
};


// ─── Farmers ─────────────────────────────────────────────────────────────────
export const getFarmers = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/farmers/${query ? '?' + query : ''}`);
  return response.data;
};

export const getFarmerStats = async () => {
  const response = await apiClient.get('/farmers/stats');
  return response.data;
};

export const getFarmerById = async (id) => {
  const response = await apiClient.get(`/farmers/${id}`);
  return response.data;
};

export const updateFarmer = async (id, data) => {
  const response = await apiClient.put(`/farmers/${id}`, data);
  return response.data;
};

export const deleteFarmer = async (id) => {
  const response = await apiClient.delete(`/farmers/${id}`);
  return response.data;
};

export const registerFarmer = async (data) => {
  const response = await apiClient.post('/farmers/register', data);
  return response.data;
};

export const assignFarmerToDealer = async (data) => {
  const response = await apiClient.post('/farmers/dealer-mapping', data);
  return response.data;
};


// ─── Dealers ─────────────────────────────────────────────────────────────────
export const getDealers = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/dealers/${query ? '?' + query : ''}`);
  return response.data;
};

export const getDealerById = async (id) => {
  const response = await apiClient.get(`/dealers/${id}`);
  return response.data;
};

export const getDealerFarmers = async (dealerId) => {
  const response = await apiClient.get(`/dealers/${dealerId}/farmers`);
  return response.data;
};

export const getDealerProjects = async (dealerId) => {
  const response = await apiClient.get(`/dealers/${dealerId}/projects`);
  return response.data;
};

export const getDealerStats = async (dealerId) => {
  const response = await apiClient.get(`/dealers/${dealerId}/stats`);
  return response.data;
};


// ─── Contractors ──────────────────────────────────────────────────────────────
export const getMyContractorTasks = async () => {
  const response = await apiClient.get('/contractors/my-tasks');
  return response.data;
};

export const getProjectContractors = async (projectId) => {
  const response = await apiClient.get(`/contractors/project/${projectId}`);
  return response.data;
};

export const getSkills = async () => {
  const response = await apiClient.get('/contractors/skills');
  return response.data;
};

export const createSkill = async (data) => {
  const response = await apiClient.post('/contractors/skills', data);
  return response.data;
};

export const updateSkill = async (id, data) => {
  const response = await apiClient.put(`/contractors/skills/${id}`, data);
  return response.data;
};

export const deleteSkill = async (id) => {
  const response = await apiClient.delete(`/contractors/skills/${id}`);
  return response.data;
};

export const getContractorsBySkill = async (skillName) => {
  const response = await apiClient.get(`/contractors/by-skill/${encodeURIComponent(skillName)}`);
  return response.data;
};

export const getContractorSkills = async (contractorId) => {
  const response = await apiClient.get(`/contractors/contractor-skills/${contractorId}`);
  return response.data;
};

export const assignSkillToContractor = async (data) => {
  const response = await apiClient.post('/contractors/contractor-skills', data);
  return response.data;
};

export const removeSkillFromContractor = async (csId) => {
  const response = await apiClient.delete(`/contractors/contractor-skills/${csId}`);
  return response.data;
};

export const assignContractor = async (data) => {
  const response = await apiClient.post('/contractors/assign', data);
  return response.data;
};

export const updateContractorAssignment = async (assignmentId, data) => {
  const response = await apiClient.put(`/contractors/assign/${assignmentId}`, data);
  return response.data;
};

export const removeContractorAssignment = async (assignmentId) => {
  const response = await apiClient.delete(`/contractors/assign/${assignmentId}`);
  return response.data;
};


// ─── Site Visits ──────────────────────────────────────────────────────────────
export const getProjectVisits = async (projectId) => {
  const response = await apiClient.get(`/site-visits/project/${projectId}`);
  return response.data;
};

export const logSiteVisit = async (data) => {
  const response = await apiClient.post('/site-visits/', data);
  return response.data;
};

export const updateSiteVisit = async (visitId, data) => {
  const response = await apiClient.put(`/site-visits/${visitId}`, data);
  return response.data;
};

export const deleteSiteVisit = async (visitId) => {
  const response = await apiClient.delete(`/site-visits/${visitId}`);
  return response.data;
};


// ─── Notifications ────────────────────────────────────────────────────────────
export const getMyNotifications = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/notifications/my${query ? '?' + query : ''}`);
  return response.data;
};

export const getUnreadCount = async () => {
  const response = await apiClient.get('/notifications/unread-count');
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await apiClient.put(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await apiClient.put('/notifications/read-all/me');
  return response.data;
};


// ─── Banks ────────────────────────────────────────────────────────────────────
export const getBanks = async () => {
  const response = await apiClient.get('/banks/');
  return response.data;
};

export const getBankBranches = async (bankId) => {
  const url = bankId ? `/banks/branches?bank_id=${bankId}` : '/banks/branches';
  const response = await apiClient.get(url);
  return response.data;
};

export const createBankBranch = async (data) => {
  const response = await apiClient.post('/banks/branches', data);
  return response.data;
};

export const updateBankBranch = async (id, data) => {
  const response = await apiClient.put(`/banks/branches/${id}`, data);
  return response.data;
};

export const deleteBankBranch = async (id) => {
  const response = await apiClient.delete(`/banks/branches/${id}`);
  return response.data;
};


// ─── Reference Data ───────────────────────────────────────────────────────────
export const getAreaTypes = async (all = false) => {
  const response = await apiClient.get(`/lookups/area-types${all ? '?all=true' : ''}`);
  return response.data;
};
export const createAreaType = async (data) => {
  const response = await apiClient.post('/lookups/area-types', data);
  return response.data;
};
export const updateAreaType = async (id, data) => {
  const response = await apiClient.put(`/lookups/area-types/${id}`, data);
  return response.data;
};
export const deleteAreaType = async (id) => {
  const response = await apiClient.delete(`/lookups/area-types/${id}`);
  return response.data;
};

// ─── Location Cascading Lookups — Read ────────────────────────────────────────
export const getStates = async () => {
  const response = await apiClient.get('/lookups/states');
  return response.data;
};
export const getDistricts = async (stateId) => {
  const url = stateId ? `/lookups/districts?state_id=${stateId}` : '/lookups/districts';
  const response = await apiClient.get(url);
  return response.data;
};
export const getTalukas = async (districtId) => {
  const url = districtId ? `/lookups/talukas?district_id=${districtId}` : '/lookups/talukas';
  const response = await apiClient.get(url);
  return response.data;
};
export const getVillages = async (talukaId) => {
  const url = talukaId ? `/lookups/villages?taluka_id=${talukaId}` : '/lookups/villages';
  const response = await apiClient.get(url);
  return response.data;
};

// ─── Location — Write (admin only) ────────────────────────────────────────────
export const createState    = async (d) => (await apiClient.post('/lookups/states', d)).data;
export const updateState    = async (id, d) => (await apiClient.put(`/lookups/states/${id}`, d)).data;
export const deleteState    = async (id) => (await apiClient.delete(`/lookups/states/${id}`)).data;

export const createDistrict = async (d) => (await apiClient.post('/lookups/districts', d)).data;
export const updateDistrict = async (id, d) => (await apiClient.put(`/lookups/districts/${id}`, d)).data;
export const deleteDistrict = async (id) => (await apiClient.delete(`/lookups/districts/${id}`)).data;

export const createTaluka   = async (d) => (await apiClient.post('/lookups/talukas', d)).data;
export const updateTaluka   = async (id, d) => (await apiClient.put(`/lookups/talukas/${id}`, d)).data;
export const deleteTaluka   = async (id) => (await apiClient.delete(`/lookups/talukas/${id}`)).data;

export const createVillage  = async (d) => (await apiClient.post('/lookups/villages', d)).data;
export const updateVillage  = async (id, d) => (await apiClient.put(`/lookups/villages/${id}`, d)).data;
export const deleteVillage  = async (id) => (await apiClient.delete(`/lookups/villages/${id}`)).data;

export const getAgencies = async () => {
  const response = await apiClient.get('/lookups/agencies');
  return response.data;
};
export const createAgency = async (data) => {
  const response = await apiClient.post('/lookups/agencies', data);
  return response.data;
};
export const updateAgency = async (id, data) => {
  const response = await apiClient.put(`/lookups/agencies/${id}`, data);
  return response.data;
};
export const deleteAgency = async (id) => {
  const response = await apiClient.delete(`/lookups/agencies/${id}`);
  return response.data;
};

export const getComponents = async (type = null) => {
  const params = type ? `?component_type=${type}` : '';
  const response = await apiClient.get(`/structures/${params}`);
  return response.data;
};
export const createComponent = async (data) => {
  const response = await apiClient.post('/structures/', data);
  return response.data;
};
export const updateComponent = async (id, data) => {
  const response = await apiClient.put(`/structures/${id}`, data);
  return response.data;
};
export const deleteComponent = async (id) => {
  const response = await apiClient.delete(`/structures/${id}`);
  return response.data;
};

export const createBank = async (data) => {
  const response = await apiClient.post('/banks/', data);
  return response.data;
};
export const updateBank = async (id, data) => {
  const response = await apiClient.put(`/banks/${id}`, data);
  return response.data;
};
export const deleteBank = async (id) => {
  const response = await apiClient.delete(`/banks/${id}`);
  return response.data;
};

// ─── Document Management ─────────────────────────────────────────────────────
export const getDocumentTypes = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/uploads/types${query ? '?' + query : ''}`);
  return response.data;
};

export const uploadDocument = async (projectId, formData) => {
  const response = await apiClient.post(`/uploads/project/${projectId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getProjectDocuments = async (projectId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/uploads/project/${projectId}${query ? '?' + query : ''}`);
  return response.data;
};

export const getAllDocuments = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/uploads/all${query ? '?' + query : ''}`);
  return response.data;
};

export const verifyDocument = async (docId, remarks = '') => {
  const params = {};
  if (remarks) params.remarks = remarks;
  const response = await apiClient.patch(`/uploads/${docId}/verify`, null, { params });
  return response.data;
};

export const deleteDocument = async (docId) => {
  const response = await apiClient.delete(`/uploads/${docId}`);
  return response.data;
};

export default apiClient;
