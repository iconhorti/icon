# ICON Mobile App — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the ICON ERP mobile companion app Phase 1 — scaffold, auth, shared infrastructure, and 5 role apps (Office Work, Loan Officer, Admin, Dealer, Farmer) deployable as an Android APK.

**Architecture:** React Native (Expo SDK 51) with role-based bottom tab navigation. Each role gets its own tab layout driven by `user.role` from JWT. Offline reads via SQLite TTL cache; write-ahead queue for form submissions. All API calls proxied through RTK Query with automatic JWT injection.

**Tech Stack:** React Native + Expo 51, TypeScript, React Navigation v6, Redux Toolkit + RTK Query, expo-sqlite, expo-secure-store, expo-local-authentication, Firebase FCM (expo-notifications), axios

**Backend base URL:** `http://<server>/api/v1` (same FastAPI backend as web app)

**Phase 2 plan:** `docs/superpowers/plans/2026-05-31-mobile-phase2.md` (Erection Manager + Agronomist)

---

## File Map

```
mobile/                              ← new directory at repo root
├── app.json                         ← Expo config
├── package.json
├── tsconfig.json
├── babel.config.js
├── App.tsx                          ← entry point, Redux Provider + NavigationContainer
│
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx        ← Auth gate: Login vs TabNavigator
│   │   ├── TabNavigator.tsx         ← role → tab config lookup
│   │   └── tabs/
│   │       ├── OfficeTabs.tsx
│   │       ├── LoanTabs.tsx
│   │       ├── AdminTabs.tsx
│   │       ├── DealerTabs.tsx
│   │       └── FarmerTabs.tsx
│   │
│   ├── store/
│   │   ├── index.ts                 ← Redux store
│   │   └── api/
│   │       ├── baseApi.ts           ← RTK Query base with JWT injector
│   │       ├── authApi.ts
│   │       ├── projectsApi.ts
│   │       ├── farmersApi.ts
│   │       ├── dashboardApi.ts
│   │       ├── documentsApi.ts
│   │       ├── notificationsApi.ts
│   │       └── dealerApi.ts
│   │
│   ├── db/
│   │   ├── schema.ts                ← SQLite table definitions + migrations
│   │   ├── cache.ts                 ← TTL read-cache wrapper
│   │   └── syncQueue.ts             ← write-ahead queue + background sync
│   │
│   ├── context/
│   │   └── AuthContext.tsx          ← JWT, user object, biometric state
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useOfflineCache.ts
│   │   └── useSyncQueue.ts
│   │
│   ├── components/
│   │   ├── shared/
│   │   │   ├── KpiCard.tsx
│   │   │   ├── ProjectRow.tsx
│   │   │   ├── StageChip.tsx
│   │   │   ├── OfflineBanner.tsx
│   │   │   ├── LoadingScreen.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── office/
│   │   │   ├── DocItem.tsx
│   │   │   ├── KycReviewCard.tsx
│   │   │   └── ApprovalItem.tsx
│   │   ├── loan/
│   │   │   ├── FarmerPipelineRow.tsx
│   │   │   └── LoanDocChecklist.tsx
│   │   ├── dealer/
│   │   │   ├── FunnelCard.tsx
│   │   │   └── DealerFarmerRow.tsx
│   │   └── farmer/
│   │       ├── StageTimeline.tsx
│   │       └── SubsidyCard.tsx
│   │
│   ├── screens/
│   │   ├── auth/
│   │   │   └── LoginScreen.tsx
│   │   ├── shared/
│   │   │   ├── NotificationsScreen.tsx
│   │   │   └── ProfileScreen.tsx
│   │   ├── office/
│   │   │   ├── OfficeDashboard.tsx
│   │   │   ├── DocInboxScreen.tsx
│   │   │   ├── KycReviewScreen.tsx
│   │   │   └── ApprovalQueueScreen.tsx
│   │   ├── loan/
│   │   │   ├── LoanDashboard.tsx
│   │   │   ├── FarmerPipelineScreen.tsx
│   │   │   ├── LoanApplicationScreen.tsx
│   │   │   ├── DisbursementScreen.tsx
│   │   │   └── BankFollowUpScreen.tsx
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── ProjectOverviewScreen.tsx
│   │   │   ├── UserManagementScreen.tsx
│   │   │   ├── SystemConfigScreen.tsx
│   │   │   └── AllAlertsScreen.tsx
│   │   ├── dealer/
│   │   │   ├── DealerDashboard.tsx
│   │   │   ├── DealerFarmersScreen.tsx
│   │   │   └── AddFarmerScreen.tsx
│   │   └── farmer/
│   │       ├── FarmerHomeScreen.tsx
│   │       ├── FarmerTimelineScreen.tsx
│   │       └── FarmerFinancialsScreen.tsx
│   │
│   ├── constants/
│   │   ├── stages.ts                ← 20 stage slugs + labels (mirrors backend)
│   │   ├── roles.ts                 ← role → tab mapping
│   │   └── theme.ts                 ← colours, spacing, typography
│   │
│   └── utils/
│       ├── format.ts                ← formatInr, formatDate, stageLabel
│       └── network.ts               ← isConnected() helper
```

---

## Task 1: Expo Project Scaffold

**Files:**
- Create: `mobile/package.json`
- Create: `mobile/app.json`
- Create: `mobile/tsconfig.json`
- Create: `mobile/babel.config.js`
- Create: `mobile/App.tsx`

- [ ] **Step 1: Initialise Expo project**

```bash
cd "E:\Google Drive\01-Pankaj\199 ICON_Accounts\95 Software Design\ICON"
npx create-expo-app mobile --template expo-template-blank-typescript
cd mobile
```

- [ ] **Step 2: Install all Phase 1 dependencies**

```bash
npx expo install expo-sqlite expo-secure-store expo-local-authentication expo-location expo-camera expo-image-picker expo-notifications expo-network

npm install @reduxjs/toolkit react-redux axios \
  @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack \
  react-native-screens react-native-safe-area-context \
  react-native-vector-icons

npx expo install react-native-gesture-handler react-native-reanimated
```

- [ ] **Step 3: Write `mobile/src/constants/theme.ts`**

```typescript
export const COLORS = {
  primary:    '#1A5C2E',
  primary2:   '#2E7D46',
  lime:       '#D4EDDA',
  gold:       '#C8972A',
  danger:     '#C0392B',
  amber:      '#E67E22',
  blue:       '#1565C0',
  bg:         '#F5F5F5',
  border:     '#E0E0E0',
  text:       '#212121',
  subtext:    '#757575',
  white:      '#FFFFFF',
  cardBg:     '#FFFFFF',
};

export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24,
};

export const RADIUS = {
  sm: 8, md: 12, lg: 16, xl: 24,
};
```

- [ ] **Step 4: Write `mobile/src/constants/stages.ts`**

```typescript
export const STAGE_LABELS: Record<string, string> = {
  draft:                  'Draft',
  farmer_onboarding:      'Farmer Onboarding',
  document_collection:    'Document Collection',
  site_visit:             'Site Visit',
  design_boq:             'Design & BOQ',
  dpr_ready:              'DPR Ready',
  bank_processing:        'Bank Processing',
  goc_registration:       'GOC Registration',
  m1_foundation:          'M1 – Foundation',
  m2_structure_erection:  'M2 – Structure Erection',
  m3_covering_material:   'M3 – Covering Material',
  m4_trellising:          'M4 – Trellising',
  m5_drip_fitting:        'M5 – Drip Fitting',
  m6_bed_preparation:     'M6 – Bed Preparation',
  m7_plantation:          'M7 – Plantation',
  subsidy_claim:          'Subsidy Claim Filed',
  agency_inspection:      'Agency Inspection',
  committee_meeting:      'Committee Meeting',
  subsidy_released:       'Subsidy Released',
  completed:              'Project Completed',
};

export const STAGE_ORDER = Object.keys(STAGE_LABELS);

export const stageLabel = (slug: string) =>
  STAGE_LABELS[slug] ?? slug.replace(/_/g, ' ');

export const stageProgress = (slug: string): number => {
  const idx = STAGE_ORDER.indexOf(slug);
  return idx < 0 ? 0 : Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
};
```

- [ ] **Step 5: Write `mobile/src/utils/format.ts`**

```typescript
export const formatInr = (n?: number | null): string => {
  if (!n) return '₹0';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

export const formatDate = (iso?: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

export const daysSince = (iso?: string | null): number | null => {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
};
```

- [ ] **Step 6: Commit**

```bash
git add mobile/
git commit -m "feat(mobile): init Expo scaffold with TypeScript, deps, theme, stage constants"
```

---

## Task 2: Auth Context + Login Screen

**Files:**
- Create: `mobile/src/context/AuthContext.tsx`
- Create: `mobile/src/hooks/useAuth.ts`
- Create: `mobile/src/screens/auth/LoginScreen.tsx`

- [ ] **Step 1: Write `AuthContext.tsx`**

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const TOKEN_KEY = 'icon_jwt';
const USER_KEY  = 'icon_user';

export interface AuthUser {
  id: number;
  role: string;
  first_name: string;
  phone: string;
  token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  unlockWithBiometric: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(USER_KEY);
      if (stored) setUser(JSON.parse(stored));
      setLoading(false);
    })();
  }, []);

  const login = async (phone: string, password: string) => {
    const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: phone, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail ?? 'Login failed');
    }
    const data: AuthUser = await res.json();
    const authUser = { ...data, token: data.token };
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(authUser));
    setUser(authUser);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(USER_KEY);
    setUser(null);
  };

  const unlockWithBiometric = async (): Promise<boolean> => {
    const hasBio = await LocalAuthentication.hasHardwareAsync();
    if (!hasBio) return true; // no hardware — skip
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock ICON',
      fallbackLabel: 'Use PIN',
    });
    return result.success;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, unlockWithBiometric }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be inside AuthProvider');
  return ctx;
};
```

- [ ] **Step 2: Create `.env` file**

```bash
# mobile/.env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api/v1
```

Replace IP with your dev machine's LAN IP (not localhost — Android device can't reach it).

- [ ] **Step 3: Write `LoginScreen.tsx`**

```typescript
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuthContext } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export default function LoginScreen() {
  const { login } = useAuthContext();
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Required', 'Enter phone number and password.');
      return;
    }
    try {
      setLoading(true);
      await login(phone, password);
    } catch (e: any) {
      Alert.alert('Login Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>🌿 ICON ERP</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <TextInput
          style={styles.input}
          placeholder="Mobile Number"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          autoComplete="tel"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Sign In</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', padding: SPACING.xl },
  card:       { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.xl },
  logo:       { fontSize: 24, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: SPACING.sm },
  subtitle:   { fontSize: 13, color: COLORS.subtext, textAlign: 'center', marginBottom: SPACING.xl },
  input:      { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: SPACING.md, marginBottom: SPACING.md, fontSize: 14 },
  btn:        { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center' },
  btnDisabled:{ opacity: 0.6 },
  btnText:    { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});
```

- [ ] **Step 4: Write `mobile/App.tsx`**

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </Provider>
  );
}
```

- [ ] **Step 5: Test login manually**

```bash
cd mobile && npx expo start
# Scan QR with Expo Go on Android device
# Enter phone: 9888888888  password: icon123
# Should navigate past login to a blank screen (navigator not built yet)
```

- [ ] **Step 6: Commit**

```bash
git add mobile/src/context/ mobile/src/screens/auth/ mobile/App.tsx mobile/.env
git commit -m "feat(mobile): auth context, secure-store JWT, login screen"
```

---

## Task 3: Redux Store + RTK Query Base

**Files:**
- Create: `mobile/src/store/index.ts`
- Create: `mobile/src/store/api/baseApi.ts`
- Create: `mobile/src/store/api/dashboardApi.ts`
- Create: `mobile/src/store/api/projectsApi.ts`
- Create: `mobile/src/store/api/farmersApi.ts`
- Create: `mobile/src/store/api/documentsApi.ts`
- Create: `mobile/src/store/api/notificationsApi.ts`

- [ ] **Step 1: Write `store/index.ts`**

```typescript
import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from './api/baseApi';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState  = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

- [ ] **Step 2: Write `store/api/baseApi.ts`**

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.EXPO_PUBLIC_API_URL,
    prepareHeaders: async (headers) => {
      const stored = await SecureStore.getItemAsync('icon_user');
      if (stored) {
        const user = JSON.parse(stored);
        headers.set('Authorization', `Bearer ${user.token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Projects', 'Farmers', 'Documents', 'Notifications', 'Stats'],
  endpoints: () => ({}),
});
```

- [ ] **Step 3: Write `store/api/dashboardApi.ts`**

```typescript
import { baseApi } from './baseApi';

export interface DashboardStats {
  total_projects:         number;
  total_farmers:          number;
  active_sites:           number;
  pending_subsidy:        number;
  completed:              number;
  total_eligible_cost:    number;
  total_subsidy_proposed: number;
  total_subsidy_received: number;
  stage_breakdown:        Record<string, number>;
  role_counts:            Record<string, number>;
  admin_metrics:          AdminMetrics;
  dealer_metrics:         DealerMetrics;
  my_project:             MyProject | null;
}

export interface AdminMetrics {
  region_data:     Array<{ name: string; count: number }>;
  area_data:       Array<{ name: string; count: number }>;
  kpis:            Record<string, number>;
  pipeline_stack:  Array<Record<string, number | string>>;
}

export interface DealerMetrics {
  funnel_data:    Array<{ name: string; value: number; fill: string }>;
  leaderboard:    Array<{ name: string; projects: number; isMe: boolean }>;
  district_data:  Array<{ name: string; count: number }>;
  commission:     { earned: number; pending: number; rate_pct: number };
}

export interface MyProject {
  id: number;
  project_code: string;
  project_name: string;
  project_stage: string;
  land_area: number;
  land_unit: string;
  area_type: string | null;
  crop_category: string | null;
  village: string | null;
  taluka: string | null;
  district: string | null;
  estimated_project_cost: number;
  total_subsidy_proposed: number;
  total_eligible_cost: number;
  created_at: string | null;
  actual_start_date: string | null;
  expected_end_date: string | null;
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStats: build.query<DashboardStats, void>({
      query: () => '/dashboard/stats',
      providesTags: ['Stats'],
    }),
  }),
});

export const { useGetStatsQuery } = dashboardApi;
```

- [ ] **Step 4: Write `store/api/projectsApi.ts`**

```typescript
import { baseApi } from './baseApi';

export interface Project {
  id: number;
  project_code: string;
  project_name: string;
  project_stage: string;
  farmer?: { id: number; first_name: string; last_name: string };
  dealer?: { id: number; first_name: string; last_name: string };
  district?: string;
  village?: string;
  land_area?: number;
  land_unit?: string;
  total_project_cost?: number;
  total_subsidy_amount_proposed?: number;
  loan_amount?: number;
  created_at: string;
}

export interface ProjectsResponse {
  items: Project[];
  total: number;
}

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProjects: build.query<ProjectsResponse, { stage?: string; limit?: number; offset?: number }>({
      query: (params) => ({ url: '/projects', params }),
      providesTags: ['Projects'],
    }),
    getProjectById: build.query<Project, number>({
      query: (id) => `/projects/${id}`,
    }),
    updateProjectFields: build.mutation<Project, { id: number; fields: Partial<Project> }>({
      query: ({ id, fields }) => ({ url: `/projects/${id}/fields`, method: 'PATCH', body: fields }),
      invalidatesTags: ['Projects'],
    }),
  }),
});

export const { useGetProjectsQuery, useGetProjectByIdQuery, useUpdateProjectFieldsMutation } = projectsApi;
```

- [ ] **Step 5: Write `store/api/farmersApi.ts`**

```typescript
import { baseApi } from './baseApi';

export interface Farmer {
  id: number;
  first_name: string;
  last_name?: string;
  phone_primary: string;
  village_id?: number;
  is_active: boolean;
  created_at: string;
}

export const farmersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getFarmers: build.query<{ items: Farmer[]; total: number }, { limit?: number; search?: string }>({
      query: (params) => ({ url: '/farmers', params }),
      providesTags: ['Farmers'],
    }),
    registerFarmer: build.mutation<Farmer, Partial<Farmer> & { password?: string }>({
      query: (body) => ({ url: '/farmers', method: 'POST', body }),
      invalidatesTags: ['Farmers'],
    }),
  }),
});

export const { useGetFarmersQuery, useRegisterFarmerMutation } = farmersApi;
```

- [ ] **Step 6: Write `store/api/documentsApi.ts`**

```typescript
import { baseApi } from './baseApi';

export interface Document {
  id: number;
  project_id: number;
  document_type: string;
  file_name: string;
  file_size?: number;
  status: 'pending' | 'approved' | 'rejected' | 'held';
  uploaded_at: string;
  reviewed_at?: string;
  review_note?: string;
  farmer_name?: string;
}

export const documentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDocuments: build.query<Document[], { status?: string; project_id?: number }>({
      query: (params) => ({ url: '/documents', params }),
      providesTags: ['Documents'],
    }),
    reviewDocument: build.mutation<Document, { id: number; status: 'approved' | 'rejected' | 'held'; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/documents/${id}/review`, method: 'PATCH', body }),
      invalidatesTags: ['Documents'],
    }),
  }),
});

export const { useGetDocumentsQuery, useReviewDocumentMutation } = documentsApi;
```

- [ ] **Step 7: Write `store/api/notificationsApi.ts`**

```typescript
import { baseApi } from './baseApi';

export interface Notification {
  id: number;
  title: string;
  body: string;
  is_read: boolean;
  notification_type: string;
  created_at: string;
  project_id?: number;
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<Notification[], void>({
      query: () => '/notifications',
      providesTags: ['Notifications'],
    }),
    markRead: build.mutation<void, number>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const { useGetNotificationsQuery, useMarkReadMutation } = notificationsApi;
```

- [ ] **Step 8: Commit**

```bash
git add mobile/src/store/
git commit -m "feat(mobile): Redux store, RTK Query base + dashboard/projects/farmers/docs/notif APIs"
```

---

## Task 4: Navigation Shell (Role-Based Tabs)

**Files:**
- Create: `mobile/src/navigation/RootNavigator.tsx`
- Create: `mobile/src/navigation/TabNavigator.tsx`
- Create: `mobile/src/navigation/tabs/OfficeTabs.tsx`
- Create: `mobile/src/navigation/tabs/LoanTabs.tsx`
- Create: `mobile/src/navigation/tabs/AdminTabs.tsx`
- Create: `mobile/src/navigation/tabs/DealerTabs.tsx`
- Create: `mobile/src/navigation/tabs/FarmerTabs.tsx`

- [ ] **Step 1: Write `RootNavigator.tsx`**

```typescript
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthContext } from '../context/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import TabNavigator from './TabNavigator';
import LoadingScreen from '../components/shared/LoadingScreen';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const { user, loading } = useAuthContext();
  if (loading) return <LoadingScreen />;
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user
        ? <Stack.Screen name="Main" component={TabNavigator} />
        : <Stack.Screen name="Login" component={LoginScreen} />
      }
    </Stack.Navigator>
  );
}
```

- [ ] **Step 2: Write `TabNavigator.tsx`**

```typescript
import React from 'react';
import { useAuthContext } from '../context/AuthContext';
import OfficeTabs   from './tabs/OfficeTabs';
import LoanTabs     from './tabs/LoanTabs';
import AdminTabs    from './tabs/AdminTabs';
import DealerTabs   from './tabs/DealerTabs';
import FarmerTabs   from './tabs/FarmerTabs';
import AccessDenied from '../screens/shared/AccessDeniedScreen';

export default function TabNavigator() {
  const { user } = useAuthContext();
  switch (user?.role) {
    case 'office_staff':                return <OfficeTabs />;
    case 'bank_officer':                return <LoanTabs />;
    case 'admin':
    case 'owner':                       return <AdminTabs />;
    case 'dealer':                      return <DealerTabs />;
    case 'farmer':                      return <FarmerTabs />;
    default:                            return <AccessDenied role={user?.role} />;
  }
}
```

- [ ] **Step 3: Write `tabs/OfficeTabs.tsx`** (pattern for all tab files)

```typescript
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { COLORS } from '../../constants/theme';
import OfficeDashboard     from '../../screens/office/OfficeDashboard';
import DocInboxScreen      from '../../screens/office/DocInboxScreen';
import ApprovalQueueScreen from '../../screens/office/ApprovalQueueScreen';
import NotificationsScreen from '../../screens/shared/NotificationsScreen';
import ProfileScreen       from '../../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const icon = (emoji: string) => () => <Text style={{ fontSize: 20 }}>{emoji}</Text>;

export default function OfficeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.subtext,
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tab.Screen name="Home"     component={OfficeDashboard}     options={{ title: 'Home',      tabBarIcon: icon('🏠') }} />
      <Tab.Screen name="Docs"     component={DocInboxScreen}      options={{ title: 'Documents', tabBarIcon: icon('📄') }} />
      <Tab.Screen name="Approvals"component={ApprovalQueueScreen} options={{ title: 'Approve',   tabBarIcon: icon('✅') }} />
      <Tab.Screen name="Alerts"   component={NotificationsScreen} options={{ title: 'Alerts',    tabBarIcon: icon('🔔') }} />
      <Tab.Screen name="Profile"  component={ProfileScreen}       options={{ title: 'Profile',   tabBarIcon: icon('👤') }} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 4: Write `tabs/LoanTabs.tsx`**

```typescript
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { COLORS } from '../../constants/theme';
import LoanDashboard         from '../../screens/loan/LoanDashboard';
import FarmerPipelineScreen  from '../../screens/loan/FarmerPipelineScreen';
import NotificationsScreen   from '../../screens/shared/NotificationsScreen';
import ProfileScreen         from '../../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const icon = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;

export default function LoanTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#1565C0', tabBarInactiveTintColor: COLORS.subtext, headerStyle: { backgroundColor: '#1565C0' }, headerTintColor: COLORS.white, headerTitleStyle: { fontWeight: '700' } }}>
      <Tab.Screen name="Home"    component={LoanDashboard}        options={{ title: 'Home',     tabBarIcon: icon('🏠') }} />
      <Tab.Screen name="Cases"   component={FarmerPipelineScreen} options={{ title: 'Cases',    tabBarIcon: icon('👩‍🌾') }} />
      <Tab.Screen name="Alerts"  component={NotificationsScreen}  options={{ title: 'Alerts',   tabBarIcon: icon('🔔') }} />
      <Tab.Screen name="Profile" component={ProfileScreen}        options={{ title: 'Profile',  tabBarIcon: icon('👤') }} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 5: Write `tabs/AdminTabs.tsx`**

```typescript
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { COLORS } from '../../constants/theme';
import AdminDashboard      from '../../screens/admin/AdminDashboard';
import ProjectOverview     from '../../screens/admin/ProjectOverviewScreen';
import NotificationsScreen from '../../screens/shared/NotificationsScreen';
import ProfileScreen       from '../../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const icon = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;

export default function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#C8972A', tabBarInactiveTintColor: COLORS.subtext, headerStyle: { backgroundColor: '#C8972A' }, headerTintColor: COLORS.white, headerTitleStyle: { fontWeight: '700' } }}>
      <Tab.Screen name="Home"     component={AdminDashboard}   options={{ title: 'Dashboard', tabBarIcon: icon('🏠') }} />
      <Tab.Screen name="Projects" component={ProjectOverview}  options={{ title: 'Projects',  tabBarIcon: icon('📊') }} />
      <Tab.Screen name="Alerts"   component={NotificationsScreen} options={{ title: 'Alerts', tabBarIcon: icon('🔔') }} />
      <Tab.Screen name="Profile"  component={ProfileScreen}    options={{ title: 'Profile',   tabBarIcon: icon('👤') }} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 6: Write `tabs/DealerTabs.tsx`**

```typescript
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { COLORS } from '../../constants/theme';
import DealerDashboard     from '../../screens/dealer/DealerDashboard';
import DealerFarmersScreen from '../../screens/dealer/DealerFarmersScreen';
import AddFarmerScreen     from '../../screens/dealer/AddFarmerScreen';
import NotificationsScreen from '../../screens/shared/NotificationsScreen';
import ProfileScreen       from '../../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const icon = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;

export default function DealerTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: COLORS.primary, tabBarInactiveTintColor: COLORS.subtext, headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: COLORS.white, headerTitleStyle: { fontWeight: '700' } }}>
      <Tab.Screen name="Home"    component={DealerDashboard}     options={{ title: 'Dashboard',   tabBarIcon: icon('🏠') }} />
      <Tab.Screen name="Farmers" component={DealerFarmersScreen} options={{ title: 'My Farmers',  tabBarIcon: icon('👨‍🌾') }} />
      <Tab.Screen name="Add"     component={AddFarmerScreen}     options={{ title: 'Add Farmer',  tabBarIcon: icon('➕') }} />
      <Tab.Screen name="Alerts"  component={NotificationsScreen} options={{ title: 'Alerts',      tabBarIcon: icon('🔔') }} />
      <Tab.Screen name="Profile" component={ProfileScreen}       options={{ title: 'Profile',     tabBarIcon: icon('👤') }} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 7: Write `tabs/FarmerTabs.tsx`**

```typescript
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { COLORS } from '../../constants/theme';
import FarmerHomeScreen      from '../../screens/farmer/FarmerHomeScreen';
import FarmerTimelineScreen  from '../../screens/farmer/FarmerTimelineScreen';
import FarmerFinancialsScreen from '../../screens/farmer/FarmerFinancialsScreen';
import NotificationsScreen   from '../../screens/shared/NotificationsScreen';
import ProfileScreen         from '../../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const icon = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;

export default function FarmerTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: COLORS.primary, tabBarInactiveTintColor: COLORS.subtext, headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: COLORS.white, headerTitleStyle: { fontWeight: '700' } }}>
      <Tab.Screen name="Project"    component={FarmerHomeScreen}       options={{ title: 'My Project', tabBarIcon: icon('🌱') }} />
      <Tab.Screen name="Timeline"   component={FarmerTimelineScreen}   options={{ title: 'Timeline',   tabBarIcon: icon('📅') }} />
      <Tab.Screen name="Financials" component={FarmerFinancialsScreen} options={{ title: 'Financials', tabBarIcon: icon('💰') }} />
      <Tab.Screen name="Alerts"     component={NotificationsScreen}    options={{ title: 'Alerts',     tabBarIcon: icon('🔔') }} />
      <Tab.Screen name="Profile"    component={ProfileScreen}          options={{ title: 'Profile',    tabBarIcon: icon('👤') }} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 8: Write stub screens for all roles** (so navigator compiles)

Create each of these files with this pattern:

```typescript
// mobile/src/screens/office/OfficeDashboard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

export default function OfficeDashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Office Dashboard — coming in Task 6</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  text: { color: COLORS.subtext, fontSize: 14 },
});
```

Repeat for: `DocInboxScreen`, `KycReviewScreen`, `ApprovalQueueScreen`, `LoanDashboard`, `FarmerPipelineScreen`, `LoanApplicationScreen`, `DisbursementScreen`, `BankFollowUpScreen`, `AdminDashboard`, `ProjectOverviewScreen`, `UserManagementScreen`, `SystemConfigScreen`, `AllAlertsScreen`, `DealerDashboard`, `DealerFarmersScreen`, `AddFarmerScreen`, `FarmerHomeScreen`, `FarmerTimelineScreen`, `FarmerFinancialsScreen`, `NotificationsScreen`, `ProfileScreen`, `AccessDeniedScreen`.

- [ ] **Step 9: Run and verify navigation works**

```bash
npx expo start
# Login as admin (9888888888 / icon123) → should land on Admin Dashboard stub
# Login as farmer → should land on Farmer Home stub
# Login as unknown role → should land on Access Denied
```

- [ ] **Step 10: Commit**

```bash
git add mobile/src/navigation/ mobile/src/screens/
git commit -m "feat(mobile): role-based tab navigation, stub screens for all Phase 1 roles"
```

---

## Task 5: Shared Components

**Files:**
- Create: `mobile/src/components/shared/KpiCard.tsx`
- Create: `mobile/src/components/shared/ProjectRow.tsx`
- Create: `mobile/src/components/shared/StageChip.tsx`
- Create: `mobile/src/components/shared/OfflineBanner.tsx`
- Create: `mobile/src/components/shared/LoadingScreen.tsx`
- Create: `mobile/src/components/shared/EmptyState.tsx`

- [ ] **Step 1: Write `KpiCard.tsx`**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accentColor?: string;
  emoji?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label, value, sub, accentColor = COLORS.primary, emoji,
}) => (
  <View style={[styles.card, { borderTopColor: accentColor }]}>
    {emoji && <Text style={styles.emoji}>{emoji}</Text>}
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
    {sub && <Text style={styles.sub}>{sub}</Text>}
  </View>
);

const styles = StyleSheet.create({
  card:  { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, borderTopWidth: 3, margin: SPACING.xs, elevation: 1 },
  emoji: { fontSize: 18, marginBottom: SPACING.xs },
  label: { fontSize: 10, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  value: { fontSize: 22, fontWeight: '800' },
  sub:   { fontSize: 10, color: COLORS.subtext, marginTop: 2 },
});
```

- [ ] **Step 2: Write `StageChip.tsx`**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { stageLabel } from '../../constants/stages';

const CHIP_COLORS: Record<string, { bg: string; text: string }> = {
  completed:         { bg: '#E8F5E9', text: '#2E7D46' },
  subsidy_released:  { bg: '#E8F5E9', text: '#2E7D46' },
  bank_processing:   { bg: '#FFF3E0', text: '#E65100' },
  goc_registration:  { bg: '#FFF3E0', text: '#E65100' },
};
const defaultChip = { bg: '#E3F2FD', text: '#1565C0' };

interface StageChipProps { stage: string; }

export const StageChip: React.FC<StageChipProps> = ({ stage }) => {
  const colors = CHIP_COLORS[stage] ?? defaultChip;
  return (
    <View style={[styles.chip, { backgroundColor: colors.bg }]}>
      <Text style={[styles.label, { color: colors.text }]}>{stageLabel(stage)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  label: { fontSize: 10, fontWeight: '700' },
});
```

- [ ] **Step 3: Write `ProjectRow.tsx`**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Project } from '../../store/api/projectsApi';
import { StageChip } from './StageChip';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface ProjectRowProps {
  project: Project;
  onPress: (project: Project) => void;
}

export const ProjectRow: React.FC<ProjectRowProps> = ({ project, onPress }) => (
  <TouchableOpacity style={styles.row} onPress={() => onPress(project)}>
    <View style={styles.icon}><Text style={{ fontSize: 18 }}>🏗️</Text></View>
    <View style={styles.body}>
      <Text style={styles.name}>{project.project_name || `Project #${project.id}`}</Text>
      <Text style={styles.sub}>
        {project.farmer
          ? `${project.farmer.first_name} ${project.farmer.last_name ?? ''}`.trim()
          : '—'}
        {project.village ? ` · ${project.village}` : ''}
      </Text>
    </View>
    <StageChip stage={project.project_stage} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, elevation: 1 },
  icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  body: { flex: 1 },
  name: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  sub:  { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
});
```

- [ ] **Step 4: Write `OfflineBanner.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Network from 'expo-network';

export const OfflineBanner: React.FC = () => {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const check = async () => {
      const state = await Network.getNetworkStateAsync();
      setOffline(!state.isConnected);
    };
    check();
    interval = setInterval(check, 10_000);
    return () => clearInterval(interval);
  }, []);

  if (!offline) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>📡 No internet — showing cached data</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: { backgroundColor: '#E65100', padding: 8, alignItems: 'center' },
  text:   { color: '#fff', fontSize: 12, fontWeight: '600' },
});
```

- [ ] **Step 5: Write `LoadingScreen.tsx` and `EmptyState.tsx`**

```typescript
// LoadingScreen.tsx
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

export default function LoadingScreen() {
  return (
    <View style={styles.c}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.t}>Loading…</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  t: { marginTop: 12, color: COLORS.subtext, fontSize: 13 },
});
```

```typescript
// EmptyState.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

interface EmptyStateProps { emoji?: string; message: string; }

export const EmptyState: React.FC<EmptyStateProps> = ({ emoji = '📭', message }) => (
  <View style={styles.c}>
    <Text style={styles.emoji}>{emoji}</Text>
    <Text style={styles.msg}>{message}</Text>
  </View>
);
const styles = StyleSheet.create({
  c:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 40, marginBottom: 12 },
  msg:   { color: COLORS.subtext, fontSize: 14, textAlign: 'center' },
});
```

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/shared/
git commit -m "feat(mobile): shared components — KpiCard, StageChip, ProjectRow, OfflineBanner"
```

---

## Task 6: Office Work Screens

**Files:**
- Modify: `mobile/src/screens/office/OfficeDashboard.tsx`
- Modify: `mobile/src/screens/office/DocInboxScreen.tsx`
- Modify: `mobile/src/screens/office/KycReviewScreen.tsx`
- Modify: `mobile/src/screens/office/ApprovalQueueScreen.tsx`

- [ ] **Step 1: Implement `OfficeDashboard.tsx`**

```typescript
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useGetDocumentsQuery } from '../../store/api/documentsApi';
import { useGetStatsQuery }    from '../../store/api/dashboardApi';
import { KpiCard }             from '../../components/shared/KpiCard';
import { OfflineBanner }       from '../../components/shared/OfflineBanner';
import { COLORS, SPACING }     from '../../constants/theme';

export default function OfficeDashboard() {
  const { data: docs }  = useGetDocumentsQuery({ status: 'pending' });
  const { data: stats } = useGetStatsQuery();

  const pendingCount  = docs?.length ?? 0;
  const dprCount      = stats?.stage_breakdown?.['dpr_ready'] ?? 0;
  const subsidyCount  = stats?.pending_subsidy ?? 0;

  return (
    <ScrollView style={styles.screen}>
      <OfflineBanner />
      <View style={styles.row}>
        <KpiCard label="Pending Docs"   value={pendingCount}  accentColor="#C62828" emoji="📄" />
        <KpiCard label="DPR Ready"      value={dprCount}      accentColor="#E65100" emoji="📐" />
        <KpiCard label="Subsidy Queue"  value={subsidyCount}  accentColor="#1565C0" emoji="💰" />
      </View>
      <Text style={styles.sectionTitle}>PENDING REVIEW</Text>
      {(docs ?? []).slice(0, 5).map((doc) => (
        <View key={doc.id} style={styles.docItem}>
          <Text style={styles.docName}>{doc.document_type} — {doc.farmer_name ?? '—'}</Text>
          <Text style={styles.docSub}>Uploaded {new Date(doc.uploaded_at).toLocaleDateString('en-IN')}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: COLORS.bg },
  row:          { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  docItem:      { backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: 10, padding: SPACING.md, elevation: 1 },
  docName:      { fontSize: 13, fontWeight: '700', color: COLORS.text },
  docSub:       { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
});
```

- [ ] **Step 2: Implement `DocInboxScreen.tsx`**

```typescript
import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useGetDocumentsQuery } from '../../store/api/documentsApi';
import { StageChip }            from '../../components/shared/StageChip';
import { OfflineBanner }        from '../../components/shared/OfflineBanner';
import { EmptyState }           from '../../components/shared/EmptyState';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

const FILTERS = ['All', 'KYC', 'Land', 'Subsidy', 'NHB', 'Legal'];

export default function DocInboxScreen() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const { data: docs = [], isLoading } = useGetDocumentsQuery({ status: 'pending' });

  const filtered = docs.filter((d) => {
    const matchFilter = filter === 'All' || d.document_type.toLowerCase().includes(filter.toLowerCase());
    const matchSearch = !search || d.farmer_name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />
      <TextInput
        style={styles.search}
        placeholder="🔍 Search farmer or document type..."
        value={search}
        onChangeText={setSearch}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {isLoading
        ? <Text style={styles.loading}>Loading…</Text>
        : filtered.length === 0
        ? <EmptyState emoji="📭" message="No documents match your filter." />
        : filtered.map((doc) => (
          <View key={doc.id} style={styles.docRow}>
            <Text style={styles.docIcon}>📄</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.docName}>{doc.document_type} — {doc.farmer_name}</Text>
              <Text style={styles.docMeta}>{doc.file_name} · {new Date(doc.uploaded_at).toLocaleDateString('en-IN')}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#FFF3E0' }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#E65100' }}>Review</Text>
            </View>
          </View>
        ))
      }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search:       { margin: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 13 },
  chips:        { paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  chip:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, marginRight: SPACING.sm },
  chipActive:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:     { fontSize: 11, fontWeight: '600', color: COLORS.subtext },
  chipTextActive: { color: COLORS.white },
  loading:      { textAlign: 'center', color: COLORS.subtext, padding: 32 },
  docRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: RADIUS.md, padding: SPACING.md, elevation: 1, gap: SPACING.md },
  docIcon:      { fontSize: 22 },
  docName:      { fontSize: 12, fontWeight: '700', color: COLORS.text },
  docMeta:      { fontSize: 10, color: COLORS.subtext, marginTop: 2 },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
});
```

- [ ] **Step 3: Implement `KycReviewScreen.tsx`**

```typescript
import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useReviewDocumentMutation } from '../../store/api/documentsApi';
import { COLORS, SPACING, RADIUS }  from '../../constants/theme';

// Reached via navigation: route.params.docId
export default function KycReviewScreen({ route, navigation }: any) {
  const docId = route.params?.docId as number;
  const [note, setNote]         = useState('');
  const [reviewDoc, { isLoading }] = useReviewDocumentMutation();

  const submit = async (status: 'approved' | 'rejected' | 'held') => {
    if ((status === 'rejected' || status === 'held') && note.trim().length < 20) {
      Alert.alert('Note Required', 'Please enter at least 20 characters explaining the reason.');
      return;
    }
    try {
      await reviewDoc({ id: docId, status, note: note.trim() || undefined }).unwrap();
      Alert.alert('Done', `Document ${status}.`);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save review. Check connection.');
    }
  };

  return (
    <ScrollView style={styles.screen}>
      <TextInput
        style={styles.noteInput}
        placeholder="Review note (required for Reject / Hold — min 20 chars)"
        multiline
        value={note}
        onChangeText={setNote}
        numberOfLines={4}
      />
      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btn, styles.btnDanger]}  onPress={() => submit('rejected')} disabled={isLoading}>
          <Text style={styles.btnText}>✗ Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => submit('held')} disabled={isLoading}>
          <Text style={[styles.btnText, { color: COLORS.primary }]}>⏸ Hold</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => submit('approved')} disabled={isLoading}>
          <Text style={styles.btnText}>✓ Approve</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md },
  noteInput:   { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 13, marginBottom: SPACING.md, minHeight: 100, textAlignVertical: 'top' },
  btnRow:      { flexDirection: 'row', gap: SPACING.sm },
  btn:         { flex: 1, padding: SPACING.md, borderRadius: RADIUS.sm, alignItems: 'center' },
  btnPrimary:  { backgroundColor: COLORS.primary },
  btnSecondary:{ backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.primary },
  btnDanger:   { backgroundColor: COLORS.danger },
  btnText:     { fontWeight: '700', fontSize: 13, color: COLORS.white },
});
```

- [ ] **Step 4: Implement `ApprovalQueueScreen.tsx`**

```typescript
import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGetDocumentsQuery, useReviewDocumentMutation } from '../../store/api/documentsApi';
import { EmptyState }   from '../../components/shared/EmptyState';
import { OfflineBanner } from '../../components/shared/OfflineBanner';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export default function ApprovalQueueScreen() {
  const { data: docs = [] } = useGetDocumentsQuery({ status: 'pending' });
  const [reviewDoc] = useReviewDocumentMutation();

  const approve = async (id: number) => {
    await reviewDoc({ id, status: 'approved' });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />
      {docs.length === 0
        ? <EmptyState emoji="✅" message="No approvals pending." />
        : docs.map((doc) => (
          <View key={doc.id} style={styles.item}>
            <Text style={styles.emoji}>📑</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{doc.document_type}</Text>
              <Text style={styles.sub}>{doc.farmer_name}</Text>
            </View>
            <TouchableOpacity style={styles.approveBtn} onPress={() => approve(doc.id)}>
              <Text style={styles.approveTxt}>Approve</Text>
            </TouchableOpacity>
          </View>
        ))
      }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  item:       { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, margin: SPACING.md, marginBottom: 0, borderRadius: RADIUS.md, padding: SPACING.md, elevation: 1, gap: SPACING.md },
  emoji:      { fontSize: 22 },
  name:       { fontSize: 13, fontWeight: '700', color: COLORS.text },
  sub:        { fontSize: 11, color: COLORS.subtext },
  approveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  approveTxt: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
});
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/office/
git commit -m "feat(mobile): Office Work screens — dashboard, doc inbox, KYC review, approval queue"
```

---

## Task 7: Loan Officer Screens

**Files:**
- Modify: `mobile/src/screens/loan/LoanDashboard.tsx`
- Modify: `mobile/src/screens/loan/FarmerPipelineScreen.tsx`
- Modify: `mobile/src/screens/loan/LoanApplicationScreen.tsx`
- Modify: `mobile/src/screens/loan/DisbursementScreen.tsx`
- Modify: `mobile/src/screens/loan/BankFollowUpScreen.tsx`

- [ ] **Step 1: Implement `LoanDashboard.tsx`**

```typescript
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery }  from '../../store/api/dashboardApi';
import { KpiCard }           from '../../components/shared/KpiCard';
import { OfflineBanner }     from '../../components/shared/OfflineBanner';
import { COLORS, SPACING }   from '../../constants/theme';

export default function LoanDashboard() {
  const { data: stats } = useGetStatsQuery();
  const kpis = stats?.admin_metrics?.kpis ?? {};

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />
      <View style={styles.row}>
        <KpiCard label="Bank WIP"     value={kpis.bank_wip ?? 0}        accentColor="#1565C0" emoji="🏦" />
        <KpiCard label="Sanctioned"   value={kpis.bank_sanctioned ?? 0} accentColor="#2E7D46" emoji="✅" />
        <KpiCard label="GOC Applied"  value={kpis.goc_applied ?? 0}     accentColor="#E65100" emoji="📋" />
      </View>
      <Text style={styles.section}>PIPELINE SUMMARY</Text>
      <View style={styles.summaryCard}>
        {[
          { label: 'Total Projects',   value: stats?.total_projects ?? 0 },
          { label: 'Active (Bank+GOC)',value: (kpis.bank_wip ?? 0) + (kpis.goc_applied ?? 0) },
          { label: 'Subsidy Pending',  value: stats?.pending_subsidy ?? 0 },
          { label: 'Completed',        value: stats?.completed ?? 0 },
        ].map(({ label, value }) => (
          <View key={label} style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text style={styles.summaryValue}>{value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row:          { flexDirection: 'row', padding: SPACING.md, gap: 6 },
  section:      { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  summaryCard:  { backgroundColor: COLORS.white, marginHorizontal: SPACING.md, borderRadius: 12, padding: SPACING.md, elevation: 1 },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  summaryLabel: { fontSize: 12, color: COLORS.subtext },
  summaryValue: { fontSize: 13, fontWeight: '700', color: COLORS.text },
});
```

- [ ] **Step 2: Implement `FarmerPipelineScreen.tsx`**

```typescript
import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useGetProjectsQuery } from '../../store/api/projectsApi';
import { ProjectRow }          from '../../components/shared/ProjectRow';
import { OfflineBanner }       from '../../components/shared/OfflineBanner';
import { EmptyState }          from '../../components/shared/EmptyState';
import { COLORS, SPACING }     from '../../constants/theme';

const STAGES = ['All', 'bank_processing', 'goc_registration', 'subsidy_claim', 'agency_inspection'];

export default function FarmerPipelineScreen({ navigation }: any) {
  const [stage, setStage]   = useState('');
  const [search, setSearch] = useState('');

  const { data } = useGetProjectsQuery({ stage: stage || undefined, limit: 100 });
  const projects = (data?.items ?? []).filter((p) =>
    !search || p.project_name?.toLowerCase().includes(search.toLowerCase()) ||
    `${p.farmer?.first_name} ${p.farmer?.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />
      <TextInput style={styles.search} placeholder="🔍 Search farmer or project…" value={search} onChangeText={setSearch} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: SPACING.md, marginBottom: SPACING.sm }}>
        {STAGES.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, stage === (s === 'All' ? '' : s) && styles.chipActive]}
            onPress={() => setStage(s === 'All' ? '' : s)}
          >
            <Text style={[styles.chipTxt, stage === (s === 'All' ? '' : s) && styles.chipTxtActive]}>
              {s === 'All' ? 'All' : s.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: SPACING.md }}>
        {projects.length === 0
          ? <EmptyState emoji="📭" message="No projects found." />
          : projects.map((p) => (
            <ProjectRow key={p.id} project={p} onPress={() => navigation.navigate('ProjectDetail', { id: p.id })} />
          ))
        }
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search:      { margin: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 13 },
  chip:        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, marginRight: 8 },
  chipActive:  { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  chipTxt:     { fontSize: 11, fontWeight: '600', color: COLORS.subtext },
  chipTxtActive: { color: COLORS.white },
});
```

- [ ] **Step 3: Stub `LoanApplicationScreen.tsx`, `DisbursementScreen.tsx`, `BankFollowUpScreen.tsx`** with project-detail-fetching skeleton:

```typescript
// LoanApplicationScreen.tsx — fetches project by id from route.params.id
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useGetProjectByIdQuery } from '../../store/api/projectsApi';
import { formatInr }             from '../../utils/format';
import { COLORS, SPACING }       from '../../constants/theme';

export default function LoanApplicationScreen({ route }: any) {
  const { data: project } = useGetProjectByIdQuery(route.params?.id);
  if (!project) return null;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md }}>
      {[
        ['Project', project.project_name ?? `#${project.id}`],
        ['Loan Amount', formatInr(project.loan_amount)],
        ['Project Cost', formatInr(project.total_project_cost)],
        ['Subsidy (Est.)', formatInr(project.total_subsidy_amount_proposed)],
      ].map(([label, value]) => (
        <View key={label} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.white, padding: SPACING.md, borderRadius: 10, marginBottom: 8, elevation: 1 },
  label: { fontSize: 12, color: COLORS.subtext },
  value: { fontSize: 13, fontWeight: '700', color: COLORS.text },
});
```

Use the same pattern for `DisbursementScreen` and `BankFollowUpScreen` with their relevant fields.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/loan/
git commit -m "feat(mobile): Loan Officer screens — dashboard, farmer pipeline, loan/disbursement detail"
```

---

## Task 8: Admin Screens

**Files:**
- Modify: `mobile/src/screens/admin/AdminDashboard.tsx`
- Modify: `mobile/src/screens/admin/ProjectOverviewScreen.tsx`
- Modify: `mobile/src/screens/admin/UserManagementScreen.tsx`
- Modify: `mobile/src/screens/admin/AllAlertsScreen.tsx`

- [ ] **Step 1: Implement `AdminDashboard.tsx`**

```typescript
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery }  from '../../store/api/dashboardApi';
import { KpiCard }           from '../../components/shared/KpiCard';
import { OfflineBanner }     from '../../components/shared/OfflineBanner';
import { formatInr }         from '../../utils/format';
import { COLORS, SPACING }   from '../../constants/theme';

export default function AdminDashboard() {
  const { data: stats } = useGetStatsQuery();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />
      <View style={styles.row}>
        <KpiCard label="Projects"  value={stats?.total_projects ?? 0}  accentColor="#C8972A" emoji="🏗️" />
        <KpiCard label="Farmers"   value={stats?.total_farmers  ?? 0}  accentColor="#2E7D46" emoji="👨‍🌾" />
        <KpiCard label="Completed" value={stats?.completed      ?? 0}  accentColor="#1565C0" emoji="✅" />
      </View>
      <View style={styles.finCard}>
        <Text style={styles.finLabel}>Total Subsidy Portfolio</Text>
        <Text style={styles.finValue}>{formatInr(stats?.total_subsidy_proposed)}</Text>
        <View style={styles.finRow}>
          <Text style={styles.finSub}>Proposed</Text>
          <Text style={[styles.finSub, { color: '#fbbf24' }]}>{formatInr(stats?.total_subsidy_proposed)}</Text>
        </View>
        <View style={styles.finRow}>
          <Text style={styles.finSub}>Received</Text>
          <Text style={[styles.finSub, { color: '#34d399' }]}>{formatInr(stats?.total_subsidy_received)}</Text>
        </View>
      </View>
      <Text style={styles.section}>TEAM</Text>
      {Object.entries(stats?.role_counts ?? {}).map(([role, count]) => (
        <View key={role} style={styles.teamRow}>
          <Text style={styles.teamLabel}>{role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
          <Text style={styles.teamCount}>{count as number}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row:       { flexDirection: 'row', padding: SPACING.md, gap: 6 },
  finCard:   { backgroundColor: '#1A5C2E', margin: SPACING.md, borderRadius: 14, padding: SPACING.lg },
  finLabel:  { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 },
  finValue:  { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: SPACING.sm },
  finRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  finSub:    { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  section:   { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  teamRow:   { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1 },
  teamLabel: { fontSize: 12, color: COLORS.subtext },
  teamCount: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
});
```

- [ ] **Step 2: Implement `ProjectOverviewScreen.tsx`**

```typescript
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery }  from '../../store/api/dashboardApi';
import { COLORS, SPACING }   from '../../constants/theme';

export default function ProjectOverviewScreen() {
  const { data: stats } = useGetStatsQuery();
  const sb = stats?.stage_breakdown ?? {};
  const regionData = stats?.admin_metrics?.region_data ?? [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Text style={styles.section}>STAGE BREAKDOWN</Text>
      {Object.entries(sb).sort((a, b) => b[1] - a[1]).map(([stage, count]) => (
        <View key={stage} style={styles.row}>
          <Text style={styles.label}>{stage.replace(/_/g, ' ')}</Text>
          <Text style={styles.count}>{count as number}</Text>
        </View>
      ))}
      <Text style={styles.section}>DISTRICT DISTRIBUTION</Text>
      {regionData.map(({ name, count }) => (
        <View key={name} style={styles.row}>
          <Text style={styles.label}>{name}</Text>
          <Text style={styles.count}>{count}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  row:     { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1 },
  label:   { fontSize: 12, color: COLORS.subtext, textTransform: 'capitalize' },
  count:   { fontSize: 14, fontWeight: '700', color: COLORS.text },
});
```

- [ ] **Step 3: Stub `UserManagementScreen` and `AllAlertsScreen`**

Use the same read-from-API pattern. `UserManagementScreen` calls `GET /users`. `AllAlertsScreen` calls `GET /notifications`. Both are list screens; stub with fetch + FlatList pattern matching existing screens.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/admin/
git commit -m "feat(mobile): Admin screens — dashboard with financial card, project overview, stubs"
```

---

## Task 9: Dealer Screens

**Files:**
- Modify: `mobile/src/screens/dealer/DealerDashboard.tsx`
- Modify: `mobile/src/screens/dealer/DealerFarmersScreen.tsx`
- Modify: `mobile/src/screens/dealer/AddFarmerScreen.tsx`

- [ ] **Step 1: Implement `DealerDashboard.tsx`**

```typescript
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery } from '../../store/api/dashboardApi';
import { KpiCard }          from '../../components/shared/KpiCard';
import { OfflineBanner }    from '../../components/shared/OfflineBanner';
import { formatInr }        from '../../utils/format';
import { COLORS, SPACING }  from '../../constants/theme';

export default function DealerDashboard() {
  const { data: stats } = useGetStatsQuery();
  const dm         = stats?.dealer_metrics ?? {};
  const commission = dm.commission ?? { earned: 0, pending: 0 };
  const funnel     = dm.funnel_data ?? [];
  const leaderboard = dm.leaderboard ?? [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />
      <View style={styles.row}>
        <KpiCard label="My Farmers"  value={stats?.total_farmers  ?? 0} accentColor={COLORS.primary} emoji="👨‍🌾" />
        <KpiCard label="Projects"    value={stats?.total_projects  ?? 0} accentColor="#1565C0"        emoji="🏗️" />
        <KpiCard label="Completed"   value={stats?.completed       ?? 0} accentColor="#2E7D46"        emoji="✅" />
      </View>
      <View style={styles.commCard}>
        <Text style={styles.commLabel}>Commission Earned</Text>
        <Text style={styles.commValue}>{formatInr(commission.earned)}</Text>
        <View style={styles.commRow}>
          <Text style={styles.commSub}>Pending: {formatInr(commission.pending)}</Text>
          <Text style={styles.commSub}>Rate: {commission.rate_pct}%</Text>
        </View>
      </View>
      {funnel.length > 0 && (
        <>
          <Text style={styles.section}>PIPELINE FUNNEL</Text>
          {funnel.map(({ name, value, fill }: any) => (
            <View key={name} style={styles.funnelRow}>
              <Text style={styles.funnelLabel}>{name}</Text>
              <Text style={[styles.funnelVal, { color: fill }]}>{value}</Text>
            </View>
          ))}
        </>
      )}
      {leaderboard.length > 0 && (
        <>
          <Text style={styles.section}>LEADERBOARD</Text>
          {leaderboard.map(({ name, projects, isMe }: any) => (
            <View key={name} style={[styles.lbRow, isMe && styles.lbMe]}>
              <Text style={[styles.lbName, isMe && { color: COLORS.primary, fontWeight: '800' }]}>{name}</Text>
              <Text style={styles.lbCount}>{projects} projects</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row:       { flexDirection: 'row', padding: SPACING.md, gap: 6 },
  commCard:  { backgroundColor: COLORS.primary, margin: SPACING.md, borderRadius: 14, padding: SPACING.lg },
  commLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  commValue: { color: '#fff', fontSize: 26, fontWeight: '800', marginVertical: 4 },
  commRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  commSub:   { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  section:   { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  funnelRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1 },
  funnelLabel:{ fontSize: 12, color: COLORS.subtext },
  funnelVal: { fontSize: 16, fontWeight: '800' },
  lbRow:     { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1 },
  lbMe:      { borderWidth: 2, borderColor: COLORS.primary },
  lbName:    { fontSize: 13, color: COLORS.text },
  lbCount:   { fontSize: 12, color: COLORS.subtext },
});
```

- [ ] **Step 2: Implement `DealerFarmersScreen.tsx`**

```typescript
import React, { useState } from 'react';
import { ScrollView, TextInput, View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useGetProjectsQuery } from '../../store/api/projectsApi';
import { ProjectRow }          from '../../components/shared/ProjectRow';
import { EmptyState }          from '../../components/shared/EmptyState';
import { OfflineBanner }       from '../../components/shared/OfflineBanner';
import { COLORS, SPACING }     from '../../constants/theme';

export default function DealerFarmersScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const { data } = useGetProjectsQuery({ limit: 200 });
  const projects = (data?.items ?? []).filter((p) =>
    !search || `${p.farmer?.first_name} ${p.farmer?.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />
      <TextInput style={styles.search} placeholder="🔍 Search farmer…" value={search} onChangeText={setSearch} />
      <View style={{ paddingHorizontal: SPACING.md }}>
        {projects.length === 0
          ? <EmptyState emoji="👨‍🌾" message="No farmers found." />
          : projects.map((p) => (
            <View key={p.id}>
              <ProjectRow project={p} onPress={() => navigation.navigate('ProjectDetail', { id: p.id })} />
              {p.farmer && (
                <TouchableOpacity
                  style={styles.waBtn}
                  onPress={() => Linking.openURL(`https://wa.me/91${p.farmer!.phone_primary ?? ''}?text=Hello+${p.farmer!.first_name}`)}
                >
                  <Text style={styles.waTxt}>💬 WhatsApp</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        }
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search: { margin: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 13 },
  waBtn:  { marginHorizontal: SPACING.md, marginTop: -4, marginBottom: SPACING.sm, backgroundColor: '#25D366', borderRadius: 8, padding: 8, alignItems: 'center' },
  waTxt:  { color: COLORS.white, fontWeight: '700', fontSize: 12 },
});
```

- [ ] **Step 3: Implement `AddFarmerScreen.tsx`**

```typescript
import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useRegisterFarmerMutation } from '../../store/api/farmersApi';
import { COLORS, SPACING, RADIUS }   from '../../constants/theme';

export default function AddFarmerScreen({ navigation }: any) {
  const [form, setForm] = useState({ first_name: '', last_name: '', phone_primary: '' });
  const [registerFarmer, { isLoading }] = useRegisterFarmerMutation();

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const submit = async () => {
    if (!form.first_name || !form.phone_primary) {
      Alert.alert('Required', 'First name and phone number are required.');
      return;
    }
    if (form.phone_primary.length !== 10) {
      Alert.alert('Invalid', 'Phone number must be 10 digits.');
      return;
    }
    try {
      await registerFarmer({ ...form, password: 'icon123' }).unwrap();
      Alert.alert('Success', `${form.first_name} registered successfully.`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.data?.detail ?? 'Registration failed. Check connection.');
    }
  };

  return (
    <ScrollView style={styles.screen}>
      {[
        { key: 'first_name',    label: 'First Name *',   placeholder: 'Ramesh',    keyType: 'default' },
        { key: 'last_name',     label: 'Last Name',      placeholder: 'Patel',     keyType: 'default' },
        { key: 'phone_primary', label: 'Mobile Number *',placeholder: '9876543210', keyType: 'phone-pad' },
      ].map(({ key, label, placeholder, keyType }) => (
        <View key={key} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            value={(form as any)[key]}
            onChangeText={set(key)}
            keyboardType={keyType as any}
          />
        </View>
      ))}
      <TouchableOpacity
        style={[styles.btn, isLoading && { opacity: 0.6 }]}
        onPress={submit}
        disabled={isLoading}
      >
        <Text style={styles.btnTxt}>{isLoading ? 'Registering…' : '✓ Register Farmer'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md },
  field:  { marginBottom: SPACING.md },
  label:  { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  input:  { backgroundColor: COLORS.white, borderRadius: RADIUS.sm, padding: SPACING.md, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 14 },
  btn:    { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.lg },
  btnTxt: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/dealer/
git commit -m "feat(mobile): Dealer screens — funnel dashboard, farmer list + WhatsApp, add farmer"
```

---

## Task 10: Farmer Screens

**Files:**
- Modify: `mobile/src/screens/farmer/FarmerHomeScreen.tsx`
- Modify: `mobile/src/screens/farmer/FarmerTimelineScreen.tsx`
- Modify: `mobile/src/screens/farmer/FarmerFinancialsScreen.tsx`

- [ ] **Step 1: Implement `FarmerHomeScreen.tsx`**

```typescript
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery }    from '../../store/api/dashboardApi';
import { OfflineBanner }       from '../../components/shared/OfflineBanner';
import { StageChip }           from '../../components/shared/StageChip';
import { stageProgress }       from '../../constants/stages';
import { formatDate, daysSince } from '../../utils/format';
import { COLORS, SPACING }     from '../../constants/theme';

export default function FarmerHomeScreen() {
  const { data: stats } = useGetStatsQuery();
  const project = stats?.my_project;

  if (!project) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🌱</Text>
        <Text style={styles.emptyTitle}>No Project Yet</Text>
        <Text style={styles.emptySub}>Contact your ICON dealer or office to begin your polyhouse project.</Text>
      </View>
    );
  }

  const pct  = stageProgress(project.project_stage);
  const days = daysSince(project.actual_start_date ?? project.created_at);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />
      <View style={styles.header}>
        <Text style={styles.projectName}>{project.project_name ?? `Project #${project.id}`}</Text>
        {project.project_code && <Text style={styles.projectCode}>{project.project_code}</Text>}
        <StageChip stage={project.project_stage} />
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Overall Progress</Text>
          <Text style={styles.progressPct}>{pct}%</Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
        </View>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: 'Days Running', value: days !== null ? String(days) : '—', emoji: '📅' },
          { label: 'Started',      value: formatDate(project.actual_start_date ?? project.created_at), emoji: '🗓️' },
          { label: 'Location',     value: [project.village, project.district].filter(Boolean).join(', ') || '—', emoji: '📍' },
        ].map(({ label, value, emoji }) => (
          <View key={label} style={styles.statCard}>
            <Text style={styles.statEmoji}>{emoji}</Text>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue}>{value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg, padding: 32 },
  emptyEmoji:   { fontSize: 48, marginBottom: 12 },
  emptyTitle:   { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  emptySub:     { fontSize: 13, color: COLORS.subtext, textAlign: 'center' },
  header:       { backgroundColor: COLORS.primary, padding: SPACING.lg, gap: SPACING.sm },
  projectName:  { fontSize: 18, fontWeight: '800', color: COLORS.white },
  projectCode:  { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  progressCard: { backgroundColor: COLORS.white, margin: SPACING.md, borderRadius: 12, padding: SPACING.md, elevation: 1 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  progressLabel:{ fontSize: 12, color: COLORS.subtext, fontWeight: '600' },
  progressPct:  { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  progressBg:   { height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 5 },
  statsRow:     { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.sm },
  statCard:     { flex: 1, backgroundColor: COLORS.white, borderRadius: 10, padding: SPACING.md, alignItems: 'center', elevation: 1 },
  statEmoji:    { fontSize: 18, marginBottom: 4 },
  statLabel:    { fontSize: 10, color: COLORS.subtext, textAlign: 'center', marginBottom: 2 },
  statValue:    { fontSize: 12, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
});
```

- [ ] **Step 2: Implement `FarmerTimelineScreen.tsx`**

```typescript
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery }  from '../../store/api/dashboardApi';
import { STAGE_ORDER, stageLabel } from '../../constants/stages';
import { COLORS, SPACING }   from '../../constants/theme';

const GROUPS: Record<string, string> = {
  draft: 'Onboarding', farmer_onboarding: 'Onboarding', document_collection: 'Onboarding',
  site_visit: 'Planning', design_boq: 'Planning', dpr_ready: 'Planning',
  bank_processing: 'Financial', goc_registration: 'Financial',
  m1_foundation: 'Construction', m2_structure_erection: 'Construction', m3_covering_material: 'Construction',
  m4_trellising: 'Construction', m5_drip_fitting: 'Construction', m6_bed_preparation: 'Construction', m7_plantation: 'Construction',
  subsidy_claim: 'Subsidy', agency_inspection: 'Subsidy', committee_meeting: 'Subsidy',
  subsidy_released: 'Subsidy', completed: 'Done',
};

export default function FarmerTimelineScreen() {
  const { data: stats } = useGetStatsQuery();
  const stage   = stats?.my_project?.project_stage ?? '';
  const currIdx = STAGE_ORDER.indexOf(stage);

  let lastGroup = '';
  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md }}>
      {STAGE_ORDER.map((slug, idx) => {
        const group   = GROUPS[slug] ?? '';
        const done    = idx < currIdx;
        const current = idx === currIdx;
        const showGrp = group !== lastGroup;
        if (showGrp) lastGroup = group;
        return (
          <React.Fragment key={slug}>
            {showGrp && <Text style={styles.group}>{group}</Text>}
            <View style={styles.step}>
              <View style={[styles.dot, done && styles.dotDone, current && styles.dotCurrent]}>
                <Text style={styles.dotTxt}>{done ? '✓' : idx + 1}</Text>
              </View>
              <View style={styles.line} />
              <Text style={[styles.label, done && styles.labelDone, current && styles.labelCurrent]}>
                {stageLabel(slug)}
              </Text>
              {current && <View style={styles.activeBadge}><Text style={styles.activeTxt}>Current</Text></View>}
            </View>
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  group:        { fontSize: 10, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  step:         { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.sm },
  dot:          { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dotDone:      { backgroundColor: COLORS.primary },
  dotCurrent:   { backgroundColor: '#E65100' },
  dotTxt:       { fontSize: 10, fontWeight: '800', color: COLORS.white },
  line:         { display: 'none' },
  label:        { flex: 1, fontSize: 13, color: '#BDBDBD' },
  labelDone:    { color: COLORS.subtext },
  labelCurrent: { color: '#E65100', fontWeight: '700' },
  activeBadge:  { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  activeTxt:    { fontSize: 10, fontWeight: '700', color: '#E65100' },
});
```

- [ ] **Step 3: Implement `FarmerFinancialsScreen.tsx`**

```typescript
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery } from '../../store/api/dashboardApi';
import { formatInr }        from '../../utils/format';
import { COLORS, SPACING }  from '../../constants/theme';

export default function FarmerFinancialsScreen() {
  const { data: stats } = useGetStatsQuery();
  const p = stats?.my_project;
  if (!p) return null;

  const cost    = p.estimated_project_cost ?? 0;
  const subsidy = p.total_subsidy_proposed ?? cost * 0.5;
  const yours   = cost - subsidy;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md }}>
      {[
        { label: 'Total Project Cost',   value: formatInr(cost),    bg: '#F5F5F5', color: COLORS.text },
        { label: 'Government Subsidy',   value: formatInr(subsidy), bg: '#E8F5E9', color: '#2E7D46' },
        { label: 'Your Investment',      value: formatInr(yours),   bg: '#FFF3E0', color: '#E65100' },
      ].map(({ label, value, bg, color }) => (
        <View key={label} style={[styles.card, { backgroundColor: bg }]}>
          <Text style={styles.cardLabel}>{label}</Text>
          <Text style={[styles.cardValue, { color }]}>{value}</Text>
        </View>
      ))}
      <View style={styles.note}>
        <Text style={styles.noteText}>💡 Subsidy is released after agency inspection and committee approval. Contact your ICON project manager for status updates.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card:       { borderRadius: 12, padding: SPACING.lg, marginBottom: SPACING.md, elevation: 1 },
  cardLabel:  { fontSize: 12, color: COLORS.subtext, fontWeight: '600', marginBottom: 4 },
  cardValue:  { fontSize: 26, fontWeight: '800' },
  note:       { backgroundColor: '#E3F2FD', borderRadius: 10, padding: SPACING.md, borderLeftWidth: 3, borderLeftColor: '#1565C0' },
  noteText:   { fontSize: 12, color: '#1565C0', fontWeight: '500', lineHeight: 18 },
});
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/farmer/
git commit -m "feat(mobile): Farmer screens — project home, 20-stage timeline, financials"
```

---

## Task 11: Shared Screens + Notifications

**Files:**
- Modify: `mobile/src/screens/shared/NotificationsScreen.tsx`
- Modify: `mobile/src/screens/shared/ProfileScreen.tsx`

- [ ] **Step 1: Implement `NotificationsScreen.tsx`**

```typescript
import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGetNotificationsQuery, useMarkReadMutation } from '../../store/api/notificationsApi';
import { EmptyState }    from '../../components/shared/EmptyState';
import { OfflineBanner } from '../../components/shared/OfflineBanner';
import { COLORS, SPACING } from '../../constants/theme';

export default function NotificationsScreen() {
  const { data: notifs = [] } = useGetNotificationsQuery();
  const [markRead] = useMarkReadMutation();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />
      {notifs.length === 0
        ? <EmptyState emoji="🔔" message="No notifications yet." />
        : notifs.map((n) => (
          <TouchableOpacity
            key={n.id}
            style={[styles.item, !n.is_read && styles.unread]}
            onPress={() => markRead(n.id)}
          >
            <View style={[styles.dot, n.is_read && { backgroundColor: '#E0E0E0' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{n.title}</Text>
              <Text style={styles.body} numberOfLines={2}>{n.body}</Text>
              <Text style={styles.time}>{new Date(n.created_at).toLocaleDateString('en-IN')}</Text>
            </View>
          </TouchableOpacity>
        ))
      }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  item:   { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1, gap: SPACING.sm, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  unread: { borderLeftColor: COLORS.primary },
  dot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 5, flexShrink: 0 },
  title:  { fontSize: 13, fontWeight: '700', color: COLORS.text },
  body:   { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  time:   { fontSize: 10, color: '#BDBDBD', marginTop: 4 },
});
```

- [ ] **Step 2: Implement `ProfileScreen.tsx`**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useAuthContext } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuthContext();

  const confirmLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.avatar}>
        <Text style={styles.avatarTxt}>{user?.first_name?.[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <Text style={styles.name}>{user?.first_name}</Text>
      <Text style={styles.role}>{user?.role?.replace(/_/g, ' ')}</Text>
      <Text style={styles.phone}>{user?.phone}</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
        <Text style={styles.logoutTxt}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  avatar:    { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  avatarTxt: { color: COLORS.white, fontSize: 32, fontWeight: '800' },
  name:      { fontSize: 20, fontWeight: '800', color: COLORS.text },
  role:      { fontSize: 13, color: COLORS.subtext, textTransform: 'capitalize', marginTop: 4 },
  phone:     { fontSize: 13, color: COLORS.subtext, marginTop: 4, marginBottom: SPACING.xl },
  logoutBtn: { backgroundColor: COLORS.danger, borderRadius: RADIUS.sm, paddingHorizontal: 32, paddingVertical: 12 },
  logoutTxt: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/shared/
git commit -m "feat(mobile): shared screens — notifications feed with mark-read, profile + logout"
```

---

## Task 12: FCM Push Notifications

**Files:**
- Create: `mobile/src/hooks/usePushNotifications.ts`
- Modify: `mobile/App.tsx`

- [ ] **Step 1: Write `usePushNotifications.ts`**

```typescript
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true,
  }),
});

export const usePushNotifications = (authToken?: string) => {
  const notificationListener = useRef<any>();
  const responseListener     = useRef<any>();

  useEffect(() => {
    if (!Device.isDevice || !authToken) return;

    (async () => {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;

      // Register token with backend
      await fetch(`${process.env.EXPO_PUBLIC_API_URL}/devices/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ push_token: token, platform: 'android' }),
      }).catch(() => { /* non-critical */ });
    })();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => { /* could update badge count here */ }
    );
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (_response) => { /* navigate to relevant screen on tap */ }
    );

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [authToken]);
};
```

- [ ] **Step 2: Add to `App.tsx`**

```typescript
// Add inside App component, after AuthProvider is rendered
// In a child component that has access to auth context:
import { usePushNotifications } from './src/hooks/usePushNotifications';
// ...
const { user } = useAuthContext();
usePushNotifications(user?.token);
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/usePushNotifications.ts mobile/App.tsx
git commit -m "feat(mobile): FCM push notification registration on login"
```

---

## Task 13: Final Integration + APK Build

- [ ] **Step 1: Verify all 5 role apps load without errors**

```bash
npx expo start
# Test each login:
# 9888888888 (admin)    → Admin Dashboard
# 9000006001 (dealer)   → Dealer Dashboard
# 4424554545 (farmer)   → Farmer Home
# 9100000001 (staff)    → Office Dashboard
# 9200000001 (bank)     → Loan Dashboard
```

- [ ] **Step 2: Build Android APK via EAS**

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

Expected output: APK download URL for internal distribution.

- [ ] **Step 3: Install on Android device and smoke test each role**

For each role, verify:
- Login works
- Home screen loads with real data
- Bottom tabs navigate correctly
- Offline banner appears when Wi-Fi disabled
- Back navigation works

- [ ] **Step 4: Final commit + tag**

```bash
git add mobile/
git commit -m "feat(mobile): Phase 1 complete — 5 roles, 20 screens, Android APK"
git tag mobile-phase1-v1.0
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by task |
|-----------------|----------------|
| React Native + Expo 51 | Task 1 |
| Role-based bottom tab navigation | Task 4 |
| JWT auth + secure store | Task 2 |
| Biometric unlock | Task 2 (AuthContext) |
| RTK Query + base API | Task 3 |
| Dashboard stats API | Task 3 |
| Office Work: doc inbox, KYC review, approval queue | Task 6 |
| Loan Officer: pipeline, loan app, disbursement | Task 7 |
| Admin: dashboard, project overview, user mgmt | Task 8 |
| Dealer: funnel, farmer list + WhatsApp, add farmer | Task 9 |
| Farmer: project home, 20-stage timeline, financials | Task 10 |
| Notifications screen + mark read | Task 11 |
| Profile + logout | Task 11 |
| FCM push token registration | Task 12 |
| Shared components (KpiCard, StageChip, ProjectRow) | Task 5 |
| OfflineBanner (network check) | Task 5 |
| formatInr, stageLabel, stageProgress utils | Task 1 |
| Android APK build | Task 13 |

**Gaps identified and addressed:**
- `AccessDeniedScreen` — added in Task 4 stub list
- Farmer "no project" empty state — added in Task 10 Step 1
- Document review requires connection (no offline write) — noted in DLR-MOB-01 req; offline SQLite queue is Phase 2 scope per SRS

**Type consistency:** All RTK Query hooks (`useGetStatsQuery`, `useGetProjectsQuery`, `useGetFarmersQuery`, `useGetDocumentsQuery`, `useGetNotificationsQuery`, `useReviewDocumentMutation`, `useRegisterFarmerMutation`, `useMarkReadMutation`) are defined in Task 3 and used consistently in Tasks 6–12. `AuthUser` interface defined in Task 2 and used in Tasks 4, 11, 12.
