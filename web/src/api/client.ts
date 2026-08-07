import axios from 'axios';
import type {
  Person, PersonCreate, PersonUpdate,
  FarmerProfile, FarmerRegistration, FarmerUpdate,
  Project, ProjectDetail, ProjectListItem, ProjectCreate, ProjectFieldUpdate,
  ProjectItem, ProjectItemCreate,
  ProjectContractor, ProjectContractorCreate,
  SiteVisit, SiteVisitCreate, SiteVisitUpdate,
  Notification, Bank, BankBranch, GovernmentAgency, Skill, Component, AreaType,
  State, District, Taluka, Village,
} from '../types/models';

// Use VITE_API_URL env var in production; fall back to the Vite dev-server proxy (/api → localhost:8000)
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

interface StoredUser {
  token?: string;
  [key: string]: unknown;
}

// ── Inject JWT Bearer token on every request ──────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('icon_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr) as StoredUser;
      if (user.token) {
        config.headers.set('Authorization', `Bearer ${user.token}`);
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

type Params = Record<string, string | number | boolean | undefined>;

const toQuery = (params: Params = {}): string => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string | number | boolean][];
  const query = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
  return query ? `?${query}` : '';
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  id: number;
  role: string;
  first_name: string;
  token: string;
  token_type: string;
  needs_password_change: boolean;
}

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await apiClient.post('/auth/login', { username, password });
  return response.data;
};

export const getMe = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
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

export const getRoleKpis = async (role: string) => {
  const response = await apiClient.get(`/dashboard/role-kpis?role=${encodeURIComponent(role)}`);
  return response.data;
};


// ─── Projects ─────────────────────────────────────────────────────────────────
export const getProjects = async (params: Params = {}): Promise<{ items: ProjectListItem[]; total: number }> => {
  const response = await apiClient.get(`/projects/${toQuery(params)}`);
  return response.data;
};

export const getProjectById = async (id: number | string): Promise<ProjectDetail> => {
  const response = await apiClient.get(`/projects/${id}`);
  return response.data;
};

export const createProject = async (data: ProjectCreate): Promise<Project> => {
  const response = await apiClient.post('/projects/', data);
  return response.data;
};

export const updateProject = async (id: number | string, data: Partial<ProjectCreate>): Promise<Project> => {
  const response = await apiClient.put(`/projects/${id}`, data);
  return response.data;
};

export const updateProjectStage = async (id: number | string, stageName: string) => {
  const response = await apiClient.put(
    `/projects/${id}/stage?stage_name=${encodeURIComponent(stageName)}`
  );
  return response.data;
};

// ── Audit trail / activity log ────────────────────────────────────────────────
// Backend contract (proposed): GET /projects/{id}/activity
//   → [{ id, actor_name, actor_role?, action, from_stage?, to_stage?, note?, created_at }]
export interface ProjectActivity {
  id: number;
  actor_name: string;
  actor_role?: string | null;
  action: string;
  from_stage?: string | null;
  to_stage?: string | null;
  note?: string | null;
  created_at: string;
}

export const getProjectActivity = async (id: number | string): Promise<ProjectActivity[]> => {
  const response = await apiClient.get(`/projects/${id}/activity`);
  return Array.isArray(response.data) ? response.data : (response.data?.activity ?? []);
};

export const updateProjectFields = async (id: number | string, fields: ProjectFieldUpdate['updates']) => {
  const response = await apiClient.patch(`/projects/${id}`, { updates: fields });
  return response.data;
};

export const deleteProject = async (id: number | string) => {
  const response = await apiClient.delete(`/projects/${id}`);
  return response.data;
};

export const addProjectItem = async (id: number | string, data: ProjectItemCreate): Promise<ProjectItem> => {
  const response = await apiClient.post(`/projects/${id}/items`, data);
  return response.data;
};

export const getProjectItems = async (projectId: number | string): Promise<ProjectItem[]> => {
  const response = await apiClient.get(`/projects/${projectId}/items`);
  return response.data;
};

export const deleteProjectItem = async (projectId: number | string, itemId: number | string) => {
  const response = await apiClient.delete(`/projects/${projectId}/items/${itemId}`);
  return response.data;
};

export const deleteAllProjectItems = async (projectId: number | string) => {
  const response = await apiClient.delete(`/projects/${projectId}/items`);
  return response.data;
};

// ─── Project Co-Applicants ─────────────────────────────────────────────────────
export const getProjectCoApplicants = async (projectId: number | string) => {
  const response = await apiClient.get(`/projects/${projectId}/co-applicants`);
  return response.data;
};

export const addProjectCoApplicant = async (projectId: number | string, farmerId: number | string) => {
  const response = await apiClient.post(`/projects/${projectId}/co-applicants`, { farmer_id: farmerId });
  return response.data;
};

export const removeProjectCoApplicant = async (projectId: number | string, farmerId: number | string) => {
  const response = await apiClient.delete(`/projects/${projectId}/co-applicants/${farmerId}`);
  return response.data;
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const getUsers = async (params: Params = {}): Promise<Person[]> => {
  const response = await apiClient.get(`/users/${toQuery(params)}`);
  return response.data;
};

export const getUserById = async (id: number | string): Promise<Person> => {
  const response = await apiClient.get(`/users/${id}`);
  return response.data;
};

export const createUser = async (data: PersonCreate): Promise<Person> => {
  const response = await apiClient.post('/users/', data);
  return response.data;
};

export const updateUser = async (id: number | string, data: PersonUpdate): Promise<Person> => {
  const response = await apiClient.put(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: number | string) => {
  const response = await apiClient.delete(`/users/${id}`);
  return response.data;
};


// ─── Farmers ─────────────────────────────────────────────────────────────────
export const getFarmers = async (params: Params = {}): Promise<Person[]> => {
  const response = await apiClient.get(`/farmers/${toQuery(params)}`);
  return response.data;
};

export const getFarmerStats = async () => {
  const response = await apiClient.get('/farmers/stats');
  return response.data;
};

export const getFarmerById = async (id: number | string): Promise<Person & { farmer_profile?: FarmerProfile }> => {
  const response = await apiClient.get(`/farmers/${id}`);
  return response.data;
};

export const updateFarmer = async (id: number | string, data: FarmerUpdate) => {
  const response = await apiClient.put(`/farmers/${id}`, data);
  return response.data;
};

export const deleteFarmer = async (id: number | string) => {
  const response = await apiClient.delete(`/farmers/${id}`);
  return response.data;
};

export const registerFarmer = async (data: Record<string, unknown>): Promise<FarmerRegistration> => {
  const response = await apiClient.post('/farmers/register', data);
  return response.data;
};

export const assignFarmerToDealer = async (data: { dealer_id: number; farmer_id: number; assigned_date?: string }) => {
  const response = await apiClient.post('/farmers/dealer-mapping', data);
  return response.data;
};


// ─── Dealers ─────────────────────────────────────────────────────────────────
export const getDealers = async (params: Params = {}): Promise<Person[]> => {
  const response = await apiClient.get(`/dealers/${toQuery(params)}`);
  return response.data;
};

export const getDealerById = async (id: number | string): Promise<Person> => {
  const response = await apiClient.get(`/dealers/${id}`);
  return response.data;
};

export const getDealerFarmers = async (dealerId: number | string): Promise<Person[]> => {
  const response = await apiClient.get(`/dealers/${dealerId}/farmers`);
  return response.data;
};

export const getDealerProjects = async (dealerId: number | string): Promise<ProjectListItem[]> => {
  const response = await apiClient.get(`/dealers/${dealerId}/projects`);
  return response.data;
};

export const getDealerStats = async (dealerId: number | string) => {
  const response = await apiClient.get(`/dealers/${dealerId}/stats`);
  return response.data;
};


// ─── Contractors ──────────────────────────────────────────────────────────────
export const getMyContractorTasks = async () => {
  const response = await apiClient.get('/contractors/my-tasks');
  return response.data;
};

export const getProjectContractors = async (projectId: number | string): Promise<ProjectContractor[]> => {
  const response = await apiClient.get(`/contractors/project/${projectId}`);
  return response.data;
};

export const getSkills = async (): Promise<Skill[]> => {
  const response = await apiClient.get('/contractors/skills');
  return response.data;
};

export const createSkill = async (data: Record<string, unknown>): Promise<Skill> => {
  const response = await apiClient.post('/contractors/skills', data);
  return response.data;
};

export const updateSkill = async (id: number | string, data: Record<string, unknown>): Promise<Skill> => {
  const response = await apiClient.put(`/contractors/skills/${id}`, data);
  return response.data;
};

export const deleteSkill = async (id: number | string) => {
  const response = await apiClient.delete(`/contractors/skills/${id}`);
  return response.data;
};

export const getContractorsBySkill = async (skillName: string): Promise<Person[]> => {
  const response = await apiClient.get(`/contractors/by-skill/${encodeURIComponent(skillName)}`);
  return response.data;
};

export const getContractorSkills = async (contractorId: number | string) => {
  const response = await apiClient.get(`/contractors/contractor-skills/${contractorId}`);
  return response.data;
};

export const assignSkillToContractor = async (data: Record<string, unknown>) => {
  const response = await apiClient.post('/contractors/contractor-skills', data);
  return response.data;
};

export const removeSkillFromContractor = async (csId: number | string) => {
  const response = await apiClient.delete(`/contractors/contractor-skills/${csId}`);
  return response.data;
};

export const assignContractor = async (data: ProjectContractorCreate): Promise<ProjectContractor> => {
  const response = await apiClient.post('/contractors/assign', data);
  return response.data;
};

export const updateContractorAssignment = async (assignmentId: number | string, data: Record<string, unknown>): Promise<ProjectContractor> => {
  const response = await apiClient.put(`/contractors/assign/${assignmentId}`, data);
  return response.data;
};

export const removeContractorAssignment = async (assignmentId: number | string) => {
  const response = await apiClient.delete(`/contractors/assign/${assignmentId}`);
  return response.data;
};


// ─── Site Visits ──────────────────────────────────────────────────────────────
export const getProjectVisits = async (projectId: number | string): Promise<SiteVisit[]> => {
  const response = await apiClient.get(`/site-visits/project/${projectId}`);
  return response.data;
};

export const logSiteVisit = async (data: SiteVisitCreate): Promise<SiteVisit> => {
  const response = await apiClient.post('/site-visits/', data);
  return response.data;
};

export const updateSiteVisit = async (visitId: number | string, data: SiteVisitUpdate): Promise<SiteVisit> => {
  const response = await apiClient.put(`/site-visits/${visitId}`, data);
  return response.data;
};

export const deleteSiteVisit = async (visitId: number | string) => {
  const response = await apiClient.delete(`/site-visits/${visitId}`);
  return response.data;
};


// ─── Notifications ────────────────────────────────────────────────────────────
export const getMyNotifications = async (params: Params = {}): Promise<Notification[]> => {
  const response = await apiClient.get(`/notifications/my${toQuery(params)}`);
  return response.data;
};

export const getUnreadCount = async (): Promise<{ unread_count: number }> => {
  const response = await apiClient.get('/notifications/unread-count');
  return response.data;
};

export const markNotificationRead = async (id: number | string) => {
  const response = await apiClient.put(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await apiClient.put('/notifications/read-all/me');
  return response.data;
};


// ─── Banks ────────────────────────────────────────────────────────────────────
export const getBanks = async (): Promise<Bank[]> => {
  const response = await apiClient.get('/banks/');
  return response.data;
};

export const getBankBranches = async (bankId?: number | string): Promise<BankBranch[]> => {
  const url = bankId ? `/banks/branches?bank_id=${bankId}` : '/banks/branches';
  const response = await apiClient.get(url);
  return response.data;
};

export const createBankBranch = async (data: Record<string, unknown>): Promise<BankBranch> => {
  const response = await apiClient.post('/banks/branches', data);
  return response.data;
};

export const updateBankBranch = async (id: number | string, data: Record<string, unknown>): Promise<BankBranch> => {
  const response = await apiClient.put(`/banks/branches/${id}`, data);
  return response.data;
};

export const deleteBankBranch = async (id: number | string) => {
  const response = await apiClient.delete(`/banks/branches/${id}`);
  return response.data;
};


// ─── Subsidy ──────────────────────────────────────────────────────────────────
// Backend: GET /subsidy/rates → { structures, crops, components, area_types }
// (routers/subsidy.py get_rates). Consumed by the SubsidyCalculator page.
export const getSubsidyRates = async (): Promise<any> => {
  const response = await apiClient.get('/subsidy/rates');
  return response.data;
};

// ─── Reference Data ───────────────────────────────────────────────────────────
export const getAreaTypes = async (all = false): Promise<AreaType[]> => {
  const response = await apiClient.get(`/lookups/area-types${all ? '?all=true' : ''}`);
  return response.data;
};
export const createAreaType = async (data: Record<string, unknown>): Promise<AreaType> => {
  const response = await apiClient.post('/lookups/area-types', data);
  return response.data;
};
export const updateAreaType = async (id: number | string, data: Record<string, unknown>): Promise<AreaType> => {
  const response = await apiClient.put(`/lookups/area-types/${id}`, data);
  return response.data;
};
export const deleteAreaType = async (id: number | string) => {
  const response = await apiClient.delete(`/lookups/area-types/${id}`);
  return response.data;
};

// ─── Location Cascading Lookups — Read ────────────────────────────────────────
export const getStates = async (): Promise<State[]> => {
  const response = await apiClient.get('/lookups/states');
  return response.data;
};
export const getDistricts = async (stateId?: number | string): Promise<District[]> => {
  const url = stateId ? `/lookups/districts?state_id=${stateId}` : '/lookups/districts';
  const response = await apiClient.get(url);
  return response.data;
};
export const getTalukas = async (districtId?: number | string): Promise<Taluka[]> => {
  const url = districtId ? `/lookups/talukas?district_id=${districtId}` : '/lookups/talukas';
  const response = await apiClient.get(url);
  return response.data;
};
export const getVillages = async (talukaId?: number | string): Promise<Village[]> => {
  const url = talukaId ? `/lookups/villages?taluka_id=${talukaId}` : '/lookups/villages';
  const response = await apiClient.get(url);
  return response.data;
};

// ─── Location — Write (admin only) ────────────────────────────────────────────
export const createState    = async (d: Record<string, unknown>): Promise<State> => (await apiClient.post('/lookups/states', d)).data;
export const updateState    = async (id: number | string, d: Record<string, unknown>): Promise<State> => (await apiClient.put(`/lookups/states/${id}`, d)).data;
export const deleteState    = async (id: number | string) => (await apiClient.delete(`/lookups/states/${id}`)).data;

export const createDistrict = async (d: Record<string, unknown>): Promise<District> => (await apiClient.post('/lookups/districts', d)).data;
export const updateDistrict = async (id: number | string, d: Record<string, unknown>): Promise<District> => (await apiClient.put(`/lookups/districts/${id}`, d)).data;
export const deleteDistrict = async (id: number | string) => (await apiClient.delete(`/lookups/districts/${id}`)).data;

export const createTaluka   = async (d: Record<string, unknown>): Promise<Taluka> => (await apiClient.post('/lookups/talukas', d)).data;
export const updateTaluka   = async (id: number | string, d: Record<string, unknown>): Promise<Taluka> => (await apiClient.put(`/lookups/talukas/${id}`, d)).data;
export const deleteTaluka   = async (id: number | string) => (await apiClient.delete(`/lookups/talukas/${id}`)).data;

export const createVillage  = async (d: Record<string, unknown>): Promise<Village> => (await apiClient.post('/lookups/villages', d)).data;
export const updateVillage  = async (id: number | string, d: Record<string, unknown>): Promise<Village> => (await apiClient.put(`/lookups/villages/${id}`, d)).data;
export const deleteVillage  = async (id: number | string) => (await apiClient.delete(`/lookups/villages/${id}`)).data;

export const getAgencies = async (): Promise<GovernmentAgency[]> => {
  const response = await apiClient.get('/lookups/agencies');
  return response.data;
};
export const createAgency = async (data: Record<string, unknown>): Promise<GovernmentAgency> => {
  const response = await apiClient.post('/lookups/agencies', data);
  return response.data;
};
export const updateAgency = async (id: number | string, data: Record<string, unknown>): Promise<GovernmentAgency> => {
  const response = await apiClient.put(`/lookups/agencies/${id}`, data);
  return response.data;
};
export const deleteAgency = async (id: number | string) => {
  const response = await apiClient.delete(`/lookups/agencies/${id}`);
  return response.data;
};

export const getComponents = async (type: string | null = null): Promise<Component[]> => {
  const params = type ? `?component_type=${type}` : '';
  const response = await apiClient.get(`/structures/${params}`);
  return response.data;
};
export const createComponent = async (data: Record<string, unknown>): Promise<Component> => {
  const response = await apiClient.post('/structures/', data);
  return response.data;
};
export const updateComponent = async (id: number | string, data: Record<string, unknown>): Promise<Component> => {
  const response = await apiClient.put(`/structures/${id}`, data);
  return response.data;
};
export const deleteComponent = async (id: number | string) => {
  const response = await apiClient.delete(`/structures/${id}`);
  return response.data;
};

export const createBank = async (data: Record<string, unknown>): Promise<Bank> => {
  const response = await apiClient.post('/banks/', data);
  return response.data;
};
export const updateBank = async (id: number | string, data: Record<string, unknown>): Promise<Bank> => {
  const response = await apiClient.put(`/banks/${id}`, data);
  return response.data;
};
export const deleteBank = async (id: number | string) => {
  const response = await apiClient.delete(`/banks/${id}`);
  return response.data;
};

// ─── Document Management ─────────────────────────────────────────────────────
export const getDocumentTypes = async (params: Params = {}) => {
  const response = await apiClient.get(`/uploads/types${toQuery(params)}`);
  return response.data;
};

export const uploadDocument = async (projectId: number | string, formData: FormData) => {
  const response = await apiClient.post(`/uploads/project/${projectId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getProjectDocuments = async (projectId: number | string, params: Params = {}) => {
  const response = await apiClient.get(`/uploads/project/${projectId}${toQuery(params)}`);
  return response.data;
};

export const getAllDocuments = async (params: Params = {}) => {
  const response = await apiClient.get(`/uploads/all${toQuery(params)}`);
  return response.data;
};

export const verifyDocument = async (docId: number | string, remarks = '') => {
  const params: Record<string, string> = {};
  if (remarks) params.remarks = remarks;
  const response = await apiClient.patch(`/uploads/${docId}/verify`, null, { params });
  return response.data;
};

export const deleteDocument = async (docId: number | string) => {
  const response = await apiClient.delete(`/uploads/${docId}`);
  return response.data;
};

export default apiClient;
