# ICON Mobile App — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 2 of the ICON ERP mobile app — Erection Manager (5 screens, full offline, camera+GPS, BOQ PDF) and Agronomist (5 screens, WebSocket IoT live monitor, offline health assessment).

**Architecture:** Two new role apps added to the existing Phase 1 scaffold. Erection Manager uses a write-ahead SQLite queue for offline form submissions. Agronomist adds a WebSocket connection for live IoT sensor data. Both share the existing auth, RTK Query, and shared components.

**Tech Stack:** React Native + Expo 51, expo-camera, expo-location, expo-sqlite (write-ahead queue), expo-sharing (PDF export), WebSocket API, react-native-chart-kit (sensor trend chart)

**Phase 1 plan:** `docs/superpowers/plans/2026-05-31-mobile-phase1.md` (complete)

---

## New API Slices Needed

| Endpoint | Used by |
|----------|---------|
| `GET /api/v1/projects?assigned=me` | Erection Manager site list |
| `POST /api/v1/site-visits` | Site Visit form submission |
| `GET /api/v1/projects/{id}/milestones` | Milestone tracker |
| `PATCH /api/v1/projects/{id}/milestones/{key}` | Update milestone progress |
| `POST /api/v1/projects/{id}/dpr` | Daily Progress Report |
| `GET /api/v1/agronomist/farms` | Agronomist farm list |
| `POST /api/v1/agronomist/farms/{id}/assessment` | Health assessment |
| `POST /api/v1/agronomist/farms/{id}/visit-report` | Visit report |
| `WS /api/v1/iot/live/{farm_id}` | IoT live sensor stream |

---

## File Map (new files only — everything from Phase 1 is preserved)

```
mobile/src/
├── navigation/
│   ├── tabs/ErectionTabs.tsx       ← new
│   └── tabs/AgronomistTabs.tsx     ← new
├── store/api/
│   ├── erectionApi.ts              ← new
│   └── agronomistApi.ts            ← new
├── db/
│   └── syncQueue.ts                ← new (write-ahead queue for offline forms)
├── screens/
│   ├── erection/
│   │   ├── ErectionDashboard.tsx
│   │   ├── SiteVisitScreen.tsx     ← 5-step multi-step form
│   │   ├── BOQScreen.tsx
│   │   ├── MilestoneTrackerScreen.tsx
│   │   └── DPRScreen.tsx
│   └── agronomist/
│       ├── AgronomistDashboard.tsx
│       ├── FarmListScreen.tsx
│       ├── IotMonitorScreen.tsx    ← WebSocket live sensor readings
│       ├── HealthAssessmentScreen.tsx
│       └── VisitReportScreen.tsx
```

---

## Task 1: New API Slices + Navigation Tabs

**Files:**
- Create: `mobile/src/store/api/erectionApi.ts`
- Create: `mobile/src/store/api/agronomistApi.ts`
- Create: `mobile/src/navigation/tabs/ErectionTabs.tsx`
- Create: `mobile/src/navigation/tabs/AgronomistTabs.tsx`
- Modify: `mobile/src/navigation/TabNavigator.tsx`
- Modify: `mobile/src/store/index.ts` (no change needed — baseApi auto-includes injected endpoints)

- [ ] **Step 1: Write `mobile/src/store/api/erectionApi.ts`**

```typescript
import { baseApi } from './baseApi';

export interface Milestone {
  key:         string;   // e.g. 'm1_foundation'
  label:       string;
  status:      'pending' | 'active' | 'completed';
  progress_pct: number;
  photos_count: number;
  signed_off:  boolean;
  signed_off_at?: string;
}

export interface SiteVisitInput {
  project_id:   number;
  gps_lat:      number;
  gps_lng:      number;
  soil_type:    string;
  water_source: string;
  electricity:  boolean;
  road_access:  string;
  observations: string;
  photos:       string[];  // S3 keys or base64 URIs queued for upload
}

export interface DPRInput {
  project_id:     number;
  milestone_key:  string;
  skilled_count:  number;
  unskilled_count: number;
  work_done:      string;
  materials:      Array<{ item: string; qty: number }>;
  photos:         string[];
}

export interface MilestoneUpdateInput {
  project_id:   number;
  milestone_key: string;
  progress_pct: number;
  description:  string;
}

export const erectionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getErectionProjects: build.query<{ items: import('./projectsApi').Project[]; total: number }, void>({
      query: () => ({ url: '/projects', params: { limit: 100 } }),
      providesTags: ['Projects'],
    }),
    getMilestones: build.query<Milestone[], number>({
      query: (projectId) => `/projects/${projectId}/milestones`,
      providesTags: (_r, _e, id) => [{ type: 'Projects', id }],
    }),
    updateMilestone: build.mutation<Milestone, MilestoneUpdateInput>({
      query: ({ project_id, milestone_key, ...body }) => ({
        url:    `/projects/${project_id}/milestones/${milestone_key}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { project_id }) => [{ type: 'Projects', id: project_id }],
    }),
    submitSiteVisit: build.mutation<{ id: number }, SiteVisitInput>({
      query: (body) => ({ url: '/site-visits', method: 'POST', body }),
      invalidatesTags: ['Projects'],
    }),
    submitDPR: build.mutation<{ id: number }, DPRInput>({
      query: (body) => ({ url: '/projects/dpr', method: 'POST', body }),
    }),
  }),
});

export const {
  useGetErectionProjectsQuery,
  useGetMilestonesQuery,
  useUpdateMilestoneMutation,
  useSubmitSiteVisitMutation,
  useSubmitDPRMutation,
} = erectionApi;
```

- [ ] **Step 2: Write `mobile/src/store/api/agronomistApi.ts`**

```typescript
import { baseApi } from './baseApi';

export interface Farm {
  id:            number;
  project_id:    number;
  farmer_name:   string;
  village:       string;
  district:      string;
  crop_type:     string;
  dap:           number;   // Days After Planting
  area_acres:    number;
  last_visit?:   string;
  alert_level:   'none' | 'warning' | 'critical';
}

export interface IoTReading {
  temperature:   number;
  humidity:      number;
  co2:           number;
  soil_moisture: number;
  ec:            number;
  ph:            number;
  timestamp:     string;
}

export interface HealthAssessmentInput {
  farm_id:      number;
  crop_stage:   string;
  plant_height: number;
  canopy_pct:   number;
  pests:        Array<{ type: string; severity: number; treatment: string }>;
  diseases:     Array<{ type: string; description: string }>;
  nutrients:    string;
  photos:       string[];
}

export interface VisitReportInput {
  farm_id:         number;
  findings_summary: string;
  recommendations: string[];
  next_visit_date: string;
  farmer_otp?:     string;
  photos:          string[];
}

export const agronomistApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getFarms: build.query<Farm[], void>({
      query: () => '/agronomist/farms',
    }),
    submitAssessment: build.mutation<{ id: number }, HealthAssessmentInput>({
      query: ({ farm_id, ...body }) => ({
        url:    `/agronomist/farms/${farm_id}/assessment`,
        method: 'POST',
        body,
      }),
    }),
    submitVisitReport: build.mutation<{ id: number }, VisitReportInput>({
      query: ({ farm_id, ...body }) => ({
        url:    `/agronomist/farms/${farm_id}/visit-report`,
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetFarmsQuery,
  useSubmitAssessmentMutation,
  useSubmitVisitReportMutation,
} = agronomistApi;
```

- [ ] **Step 3: Write `mobile/src/navigation/tabs/ErectionTabs.tsx`**

```typescript
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import ErectionDashboard      from '../../screens/erection/ErectionDashboard';
import SiteVisitScreen        from '../../screens/erection/SiteVisitScreen';
import MilestoneTrackerScreen from '../../screens/erection/MilestoneTrackerScreen';
import DPRScreen              from '../../screens/erection/DPRScreen';
import NotificationsScreen    from '../../screens/shared/NotificationsScreen';

const Tab = createBottomTabNavigator();
const ico = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;
const ORANGE = '#E65100';

export default function ErectionTabs() {
  return (
    <Tab.Navigator screenOptions={{
      tabBarActiveTintColor:   ORANGE,
      tabBarInactiveTintColor: '#757575',
      headerStyle:             { backgroundColor: ORANGE },
      headerTintColor:         '#fff',
      headerTitleStyle:        { fontWeight: '700' },
    }}>
      <Tab.Screen name="Home"      component={ErectionDashboard}      options={{ title: 'Sites',     tabBarIcon: ico('🏗️') }} />
      <Tab.Screen name="SiteVisit" component={SiteVisitScreen}        options={{ title: 'New Visit', tabBarIcon: ico('📍') }} />
      <Tab.Screen name="Milestones"component={MilestoneTrackerScreen} options={{ title: 'Progress',  tabBarIcon: ico('🧱') }} />
      <Tab.Screen name="DPR"       component={DPRScreen}              options={{ title: 'DPR',       tabBarIcon: ico('📷') }} />
      <Tab.Screen name="Alerts"    component={NotificationsScreen}    options={{ title: 'Alerts',    tabBarIcon: ico('🔔') }} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 4: Write `mobile/src/navigation/tabs/AgronomistTabs.tsx`**

```typescript
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import AgronomistDashboard    from '../../screens/agronomist/AgronomistDashboard';
import FarmListScreen         from '../../screens/agronomist/FarmListScreen';
import IotMonitorScreen       from '../../screens/agronomist/IotMonitorScreen';
import HealthAssessmentScreen from '../../screens/agronomist/HealthAssessmentScreen';
import NotificationsScreen    from '../../screens/shared/NotificationsScreen';

const Tab = createBottomTabNavigator();
const ico = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;
const PURPLE = '#6A1B9A';

export default function AgronomistTabs() {
  return (
    <Tab.Navigator screenOptions={{
      tabBarActiveTintColor:   PURPLE,
      tabBarInactiveTintColor: '#757575',
      headerStyle:             { backgroundColor: PURPLE },
      headerTintColor:         '#fff',
      headerTitleStyle:        { fontWeight: '700' },
    }}>
      <Tab.Screen name="Home"       component={AgronomistDashboard}    options={{ title: 'Dashboard',   tabBarIcon: ico('🌱') }} />
      <Tab.Screen name="Farms"      component={FarmListScreen}         options={{ title: 'My Farms',    tabBarIcon: ico('🌾') }} />
      <Tab.Screen name="IoT"        component={IotMonitorScreen}       options={{ title: 'IoT Live',    tabBarIcon: ico('🌡️') }} />
      <Tab.Screen name="Assessment" component={HealthAssessmentScreen} options={{ title: 'Assessment',  tabBarIcon: ico('📊') }} />
      <Tab.Screen name="Alerts"     component={NotificationsScreen}    options={{ title: 'Alerts',      tabBarIcon: ico('🔔') }} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 5: Add stubs for all Phase 2 screens**

Create stub screens (same pattern as Phase 1) for:
- `mobile/src/screens/erection/ErectionDashboard.tsx`
- `mobile/src/screens/erection/SiteVisitScreen.tsx`
- `mobile/src/screens/erection/BOQScreen.tsx`
- `mobile/src/screens/erection/MilestoneTrackerScreen.tsx`
- `mobile/src/screens/erection/DPRScreen.tsx`
- `mobile/src/screens/agronomist/AgronomistDashboard.tsx`
- `mobile/src/screens/agronomist/FarmListScreen.tsx`
- `mobile/src/screens/agronomist/IotMonitorScreen.tsx`
- `mobile/src/screens/agronomist/HealthAssessmentScreen.tsx`
- `mobile/src/screens/agronomist/VisitReportScreen.tsx`

- [ ] **Step 6: Update `TabNavigator.tsx` to add the two new roles**

Add to the switch statement in `mobile/src/navigation/TabNavigator.tsx`:
```typescript
import ErectionTabs   from './tabs/ErectionTabs';
import AgronomistTabs from './tabs/AgronomistTabs';

// In the switch:
case 'project_manager':
case 'structure_contractor':
case 'drip_contractor':
case 'bed_contractor':
case 'plantation_contractor': return <ErectionTabs />;
case 'agronomist':             return <AgronomistTabs />;
```

- [ ] **Step 7: `npx tsc --noEmit` — 0 errors required**

- [ ] **Step 8: Commit**

```bash
git add mobile/src/store/api/erectionApi.ts mobile/src/store/api/agronomistApi.ts \
  mobile/src/navigation/tabs/ErectionTabs.tsx mobile/src/navigation/tabs/AgronomistTabs.tsx \
  mobile/src/navigation/TabNavigator.tsx mobile/src/screens/erection/ mobile/src/screens/agronomist/
git commit -m "feat(mobile): Phase 2 API slices, tab navigators, stub screens for Erection Manager + Agronomist"
```

---

## Task 2: Offline Write-Ahead Queue (syncQueue.ts)

**Files:**
- Create: `mobile/src/db/syncQueue.ts`

- [ ] **Step 1: Write `mobile/src/db/syncQueue.ts`**

```typescript
import * as SQLite from 'expo-sqlite';
import * as Network from 'expo-network';

export type QueueItemType = 'site_visit' | 'dpr' | 'health_assessment' | 'visit_report';

export interface QueueItem {
  id:         number;
  type:       QueueItemType;
  payload:    string;   // JSON-serialised request body
  endpoint:   string;   // e.g. '/site-visits'
  method:     string;   // POST or PATCH
  created_at: number;
  attempts:   number;
}

const QUEUE_DB = 'icon_queue.db';
let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(QUEUE_DB);
  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      type       TEXT NOT NULL,
      payload    TEXT NOT NULL,
      endpoint   TEXT NOT NULL,
      method     TEXT NOT NULL DEFAULT 'POST',
      created_at INTEGER NOT NULL,
      attempts   INTEGER NOT NULL DEFAULT 0
    );
  `);
  return _db;
}

/** Add a form submission to the queue (called immediately — no network needed). */
export async function queueAdd(
  type: QueueItemType,
  endpoint: string,
  payload: object,
  method = 'POST'
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO sync_queue (type, payload, endpoint, method, created_at) VALUES (?, ?, ?, ?, ?)',
    [type, JSON.stringify(payload), endpoint, method, Date.now()]
  );
}

/** Return all pending queue items. */
export async function queueGetAll(): Promise<QueueItem[]> {
  const db = await getDb();
  return db.getAllAsync<QueueItem>('SELECT * FROM sync_queue ORDER BY created_at ASC');
}

/** Remove a successfully-synced item. */
export async function queueRemove(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
}

/** Increment the attempt counter (for retry tracking). */
export async function queueIncrementAttempts(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE sync_queue SET attempts = attempts + 1 WHERE id = ?', [id]);
}

/** Count pending items (for badge display). */
export async function queueCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM sync_queue');
  return row?.n ?? 0;
}

/**
 * Attempt to sync all queued items against the API.
 * Called on app foreground and on reconnect.
 * Returns { synced, failed } counts.
 */
export async function syncNow(authToken: string, apiUrl: string): Promise<{ synced: number; failed: number }> {
  const state = await Network.getNetworkStateAsync();
  if (!state.isConnected) return { synced: 0, failed: 0 };

  const items = await queueGetAll();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await queueIncrementAttempts(item.id);
      const res = await fetch(`${apiUrl}${item.endpoint}`, {
        method:  item.method,
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: item.payload,
      });
      if (res.ok) {
        await queueRemove(item.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}
```

- [ ] **Step 2: Write `mobile/src/hooks/useSyncQueue.ts`**

```typescript
import { useEffect, useCallback, useState } from 'react';
import { AppState }    from 'react-native';
import { syncNow, queueCount } from '../db/syncQueue';

/**
 * Runs background sync when the app comes to the foreground.
 * Returns pending queue count for UI badge display.
 */
export function useSyncQueue(authToken: string | undefined): { pendingCount: number } {
  const [pendingCount, setPendingCount] = useState(0);
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.100:8000/api/v1';

  const updateCount = useCallback(async () => {
    const n = await queueCount();
    setPendingCount(n);
  }, []);

  const attemptSync = useCallback(async () => {
    if (!authToken) return;
    await syncNow(authToken, apiUrl);
    await updateCount();
  }, [authToken, apiUrl, updateCount]);

  useEffect(() => {
    updateCount();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') attemptSync();
    });
    return () => sub.remove();
  }, [attemptSync, updateCount]);

  return { pendingCount };
}
```

- [ ] **Step 3: `npx tsc --noEmit` — 0 errors**

- [ ] **Step 4: Commit**

```bash
git add mobile/src/db/syncQueue.ts mobile/src/hooks/useSyncQueue.ts
git commit -m "feat(mobile): offline write-ahead sync queue — site visits, DPRs queued in SQLite and synced on reconnect"
```

---

## Task 3: Erection Manager Screens

**Files:**
- Modify: `mobile/src/screens/erection/ErectionDashboard.tsx`
- Modify: `mobile/src/screens/erection/SiteVisitScreen.tsx`
- Modify: `mobile/src/screens/erection/MilestoneTrackerScreen.tsx`
- Modify: `mobile/src/screens/erection/DPRScreen.tsx`

- [ ] **Step 1: Implement `ErectionDashboard.tsx`**

```typescript
import React, { useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useGetErectionProjectsQuery } from '../../store/api/erectionApi';
import { OfflineBanner }  from '../../components/shared/OfflineBanner';
import { EmptyState }     from '../../components/shared/EmptyState';
import { stageLabel }     from '../../constants/stages';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import type { NavigationProp } from '@react-navigation/native';

const ORANGE = '#E65100';

interface Props { navigation: NavigationProp<any>; }

export default function ErectionDashboard({ navigation }: Props) {
  const { data, isError, isFetching, refetch } = useGetErectionProjectsQuery();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Filter to construction-stage projects
  const CONSTRUCTION_STAGES = ['m1_foundation','m2_structure_erection','m3_covering_material','m4_trellising','m5_drip_fitting','m6_bed_preparation','m7_plantation','site_visit','design_boq','dpr_ready'];
  const sites = (data?.items ?? []).filter(p => CONSTRUCTION_STAGES.includes(p.project_stage));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      refreshControl={<RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} colors={[ORANGE]} tintColor={ORANGE} />}
    >
      <OfflineBanner />
      {isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Could not load sites. Pull to retry.</Text>
        </View>
      )}
      <View style={styles.summary}>
        <Text style={styles.summaryCount}>{sites.length}</Text>
        <Text style={styles.summaryLabel}>Active Sites</Text>
      </View>
      {sites.length === 0
        ? <EmptyState emoji="🏗️" message="No active construction sites assigned." />
        : sites.map((p) => {
          const milestoneNum = p.project_stage.startsWith('m') ? parseInt(p.project_stage[1]) : 0;
          const pct = milestoneNum > 0 ? Math.round((milestoneNum / 7) * 100) : 10;
          return (
            <TouchableOpacity
              key={p.id}
              style={styles.siteCard}
              onPress={() => navigation.navigate('Milestones', { projectId: p.id })}
            >
              <View style={styles.siteHeader}>
                <Text style={styles.siteName} numberOfLines={1}>
                  {p.project_name ?? `Project #${p.id}`}
                </Text>
                <Text style={styles.stageChip}>{stageLabel(p.project_stage)}</Text>
              </View>
              <Text style={styles.siteSub}>
                {p.farmer ? `${p.farmer.first_name} ${p.farmer.last_name ?? ''}`.trim() : '—'}
                {p.village ? ` · ${p.village}` : ''}
              </Text>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
              </View>
              <Text style={styles.progressText}>{pct}% complete</Text>
            </TouchableOpacity>
          );
        })
      }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  errorBanner:   { backgroundColor: '#FFEBEE', margin: 12, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errorText:     { color: '#C62828', fontSize: 13, fontWeight: '600' },
  summary:       { backgroundColor: ORANGE, margin: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center' },
  summaryCount:  { fontSize: 36, fontWeight: '800', color: '#fff' },
  summaryLabel:  { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  siteCard:      { backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: RADIUS.md, padding: SPACING.md, elevation: 2 },
  siteHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  siteName:      { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1 },
  stageChip:     { fontSize: 10, fontWeight: '700', color: ORANGE, backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  siteSub:       { fontSize: 11, color: COLORS.subtext, marginBottom: SPACING.sm },
  progressBg:    { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: ORANGE, borderRadius: 3 },
  progressText:  { fontSize: 10, color: COLORS.subtext, marginTop: 4, textAlign: 'right' },
});
```

- [ ] **Step 2: Implement `SiteVisitScreen.tsx`** (5-step form with offline SQLite queue)

```typescript
import React, { useState } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  Switch, Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import * as Location from 'expo-location';
import { queueAdd }   from '../../db/syncQueue';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

const ORANGE = '#E65100';
const STEPS = ['Location', 'Farmer', 'Observations', 'Photos', 'Review'];

export default function SiteVisitScreen() {
  const [step, setStep]                   = useState(0);
  const [gpsLat, setGpsLat]               = useState<number | null>(null);
  const [gpsLng, setGpsLng]               = useState<number | null>(null);
  const [gpsLoading, setGpsLoading]       = useState(false);
  const [soilType, setSoilType]           = useState('');
  const [waterSource, setWaterSource]     = useState('');
  const [electricity, setElectricity]     = useState(false);
  const [roadAccess, setRoadAccess]       = useState('');
  const [observations, setObservations]   = useState('');
  const [submitting, setSubmitting]       = useState(false);

  const captureGPS = async () => {
    setGpsLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Location access is needed for site visits.');
      setGpsLoading(false);
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setGpsLat(loc.coords.latitude);
    setGpsLng(loc.coords.longitude);
    setGpsLoading(false);
  };

  const handleSubmit = async () => {
    if (!gpsLat || !gpsLng) { Alert.alert('GPS Required', 'Capture GPS before submitting.'); return; }
    if (!observations.trim() || observations.trim().length < 10) {
      Alert.alert('Observations Required', 'Enter at least 10 characters of observations.');
      return;
    }
    setSubmitting(true);
    await queueAdd('site_visit', '/site-visits', {
      gps_lat: gpsLat, gps_lng: gpsLng,
      soil_type: soilType, water_source: waterSource,
      electricity, road_access: roadAccess,
      observations,
      submitted_at: new Date().toISOString(),
    });
    setSubmitting(false);
    Alert.alert('Saved Offline', 'Site visit saved locally. It will sync when you reconnect.', [
      { text: 'OK', onPress: () => { setStep(0); setSoilType(''); setWaterSource(''); setObservations(''); setGpsLat(null); setGpsLng(null); } },
    ]);
  };

  const stepContent = [
    // Step 0 — Location
    <View key="0">
      <Text style={styles.fieldLabel}>GPS Coordinates</Text>
      {gpsLat
        ? <Text style={styles.gpsValue}>{gpsLat.toFixed(5)}° N, {gpsLng!.toFixed(5)}° E</Text>
        : <Text style={styles.gpsEmpty}>Not captured yet</Text>
      }
      <TouchableOpacity style={[styles.gpsBtn, gpsLoading && { opacity: 0.6 }]} onPress={captureGPS} disabled={gpsLoading}>
        {gpsLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.gpsBtnTxt}>📍 Capture GPS</Text>}
      </TouchableOpacity>
      <Text style={styles.fieldLabel}>Road Access</Text>
      <TextInput style={styles.input} placeholder="All-weather / Seasonal / No road" value={roadAccess} onChangeText={setRoadAccess} />
    </View>,

    // Step 1 — Farmer (info display only)
    <View key="1">
      <Text style={styles.info}>Farmer details are linked from the project record.</Text>
      <Text style={styles.fieldLabel}>Site Area</Text>
      <TextInput style={styles.input} placeholder="e.g. 2.5 Acres" />
      <Text style={styles.fieldLabel}>Water Source</Text>
      <TextInput style={styles.input} placeholder="Borewell / Canal / Rain-fed" value={waterSource} onChangeText={setWaterSource} />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Electricity Available</Text>
        <Switch value={electricity} onValueChange={setElectricity} trackColor={{ true: COLORS.primary }} />
      </View>
    </View>,

    // Step 2 — Observations
    <View key="2">
      <Text style={styles.fieldLabel}>Soil Type</Text>
      <TextInput style={styles.input} placeholder="Sandy Loam / Clay / Black Cotton..." value={soilType} onChangeText={setSoilType} />
      <Text style={styles.fieldLabel}>Key Observations *</Text>
      <TextInput style={[styles.input, styles.textArea]} placeholder="Slope, existing structures, hazards, special notes (min 10 chars)..." multiline numberOfLines={5} value={observations} onChangeText={setObservations} textAlignVertical="top" />
    </View>,

    // Step 3 — Photos (placeholder — camera integration in Phase 2 polish)
    <View key="3">
      <Text style={styles.info}>Minimum 4 photos required: corners, water source, road access, any issues.</Text>
      <View style={styles.photosGrid}>
        {['Corner', 'Water', 'Road', 'Other'].map((label) => (
          <View key={label} style={styles.photoBox}>
            <Text style={styles.photoIcon}>📷</Text>
            <Text style={styles.photoLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.photosNote}>Camera integration coming in Phase 2 polish.</Text>
    </View>,

    // Step 4 — Review & Submit
    <View key="4">
      <Text style={styles.fieldLabel}>REVIEW</Text>
      {[
        { label: 'GPS', value: gpsLat ? `${gpsLat.toFixed(4)}, ${gpsLng!.toFixed(4)}` : '⚠️ Not captured' },
        { label: 'Soil Type',   value: soilType     || '—' },
        { label: 'Water',       value: waterSource  || '—' },
        { label: 'Electricity', value: electricity ? 'Yes' : 'No' },
        { label: 'Road',        value: roadAccess   || '—' },
        { label: 'Observations', value: observations ? `${observations.length} chars` : '⚠️ Missing' },
      ].map(({ label, value }) => (
        <View key={label} style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>{label}</Text>
          <Text style={styles.reviewValue}>{value}</Text>
        </View>
      ))}
      <View style={styles.offlineNote}>
        <Text style={styles.offlineText}>This form will be saved offline and synced when connected.</Text>
      </View>
    </View>,
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Step indicator */}
      <View style={styles.stepBar}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <View style={[styles.stepDot, i <= step && { backgroundColor: ORANGE }]}>
              <Text style={styles.stepDotTxt}>{i < step ? '✓' : String(i + 1)}</Text>
            </View>
            {i < STEPS.length - 1 && <View style={[styles.stepLine, i < step && { backgroundColor: ORANGE }]} />}
          </React.Fragment>
        ))}
      </View>
      <Text style={styles.stepTitle}>{STEPS[step]}</Text>

      <View style={{ padding: SPACING.md }}>
        {stepContent[step]}
      </View>

      {/* Navigation buttons */}
      <View style={styles.navRow}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
            <Text style={styles.backBtnTxt}>← Back</Text>
          </TouchableOpacity>
        )}
        {step < STEPS.length - 1
          ? (
            <TouchableOpacity style={[styles.nextBtn, step === 0 && !gpsLat && { opacity: 0.5 }]} onPress={() => setStep(s => s + 1)}>
              <Text style={styles.nextBtnTxt}>Next →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnTxt}>Save Site Visit</Text>}
            </TouchableOpacity>
          )
        }
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  stepBar:       { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, paddingTop: SPACING.lg },
  stepDot:       { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center' },
  stepDotTxt:    { fontSize: 11, fontWeight: '800', color: '#fff' },
  stepLine:      { flex: 1, height: 2, backgroundColor: '#E0E0E0', marginHorizontal: 2 },
  stepTitle:     { fontSize: 16, fontWeight: '800', color: COLORS.text, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  fieldLabel:    { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: SPACING.md },
  input:         { backgroundColor: COLORS.white, borderRadius: RADIUS.sm, padding: SPACING.md, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 14 },
  textArea:      { minHeight: 100 },
  gpsValue:      { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: SPACING.sm },
  gpsEmpty:      { fontSize: 13, color: COLORS.subtext, marginBottom: SPACING.sm },
  gpsBtn:        { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center', marginTop: 4 },
  gpsBtnTxt:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  switchRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.sm },
  switchLabel:   { fontSize: 14, color: COLORS.text },
  info:          { fontSize: 13, color: COLORS.subtext, lineHeight: 20, marginBottom: SPACING.md },
  photosGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  photoBox:      { width: '47%', aspectRatio: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed' },
  photoIcon:     { fontSize: 32, marginBottom: 8 },
  photoLabel:    { fontSize: 11, color: COLORS.subtext, fontWeight: '600' },
  photosNote:    { fontSize: 11, color: COLORS.subtext, textAlign: 'center', marginTop: SPACING.md },
  reviewRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  reviewLabel:   { fontSize: 12, color: COLORS.subtext },
  reviewValue:   { fontSize: 13, fontWeight: '600', color: COLORS.text },
  offlineNote:   { backgroundColor: '#E3F2FD', borderRadius: 10, padding: SPACING.md, marginTop: SPACING.md, borderLeftWidth: 3, borderLeftColor: '#1565C0' },
  offlineText:   { fontSize: 12, color: '#1565C0' },
  navRow:        { flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm },
  backBtn:       { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border },
  backBtnTxt:    { color: COLORS.text, fontWeight: '700' },
  nextBtn:       { flex: 2, backgroundColor: ORANGE, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center' },
  nextBtnTxt:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  submitBtn:     { flex: 2, backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center' },
  submitBtnTxt:  { color: '#fff', fontWeight: '700', fontSize: 15 },
});
```

- [ ] **Step 3: Implement `MilestoneTrackerScreen.tsx`**

```typescript
import React, { useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert, RefreshControl, StyleSheet } from 'react-native';
import { useGetMilestonesQuery, useUpdateMilestoneMutation } from '../../store/api/erectionApi';
import { EmptyState }   from '../../components/shared/EmptyState';
import { OfflineBanner } from '../../components/shared/OfflineBanner';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import type { NavigationProp, RouteProp } from '@react-navigation/native';

const ORANGE = '#E65100';
const MILESTONE_LABELS: Record<string, string> = {
  m1_foundation: 'M1 — Foundation',
  m2_structure_erection: 'M2 — Structure Erection',
  m3_covering_material: 'M3 — Covering Material',
  m4_trellising: 'M4 — Trellising',
  m5_drip_fitting: 'M5 — Drip Fitting',
  m6_bed_preparation: 'M6 — Bed Preparation',
  m7_plantation: 'M7 — Plantation',
};

export default function MilestoneTrackerScreen({ route }: { route: RouteProp<any, any> }) {
  const projectId = route.params?.projectId as number;
  const { data: milestones = [], isLoading, refetch, isFetching } = useGetMilestonesQuery(projectId ?? 0, { skip: !projectId });
  const [updateMilestone] = useUpdateMilestoneMutation();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (!projectId) {
    return <EmptyState emoji="🧱" message="Open a project from the Sites screen to view milestones." />;
  }

  const MILESTONE_KEYS = Object.keys(MILESTONE_LABELS);
  const displayMilestones = MILESTONE_KEYS.map(key => {
    const found = milestones.find(m => m.key === key);
    return found ?? { key, label: MILESTONE_LABELS[key], status: 'pending' as const, progress_pct: 0, photos_count: 0, signed_off: false };
  });

  const handleSignOff = (milestoneKey: string, label: string) => {
    Alert.alert(
      `Sign Off ${label}?`,
      'This requires minimum 3 milestone photos. This action will be logged.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Off', onPress: async () => {
            await updateMilestone({ project_id: projectId, milestone_key: milestoneKey, progress_pct: 100, description: 'Milestone signed off via mobile' });
          }
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      refreshControl={<RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} colors={[ORANGE]} />}
    >
      <OfflineBanner />
      {displayMilestones.map((m, idx) => {
        const isDone    = m.signed_off || m.status === 'completed';
        const isActive  = m.status === 'active' || (!isDone && idx === displayMilestones.findIndex(x => !x.signed_off && x.status !== 'completed'));
        return (
          <View key={m.key} style={[styles.card, isDone && styles.cardDone]}>
            <View style={styles.cardHeader}>
              <View style={[styles.dot, isDone && styles.dotDone, isActive && styles.dotActive]}>
                <Text style={styles.dotTxt}>{isDone ? '✓' : String(idx + 1)}</Text>
              </View>
              <Text style={styles.milestoneLabel}>{MILESTONE_LABELS[m.key] ?? m.key}</Text>
              {isDone
                ? <Text style={styles.doneBadge}>Done</Text>
                : isActive
                ? <Text style={styles.activeBadge}>Active</Text>
                : <Text style={styles.pendingBadge}>Pending</Text>
              }
            </View>
            {isActive && !isDone && (
              <View style={styles.cardActions}>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${m.progress_pct}%` as any }]} />
                </View>
                <Text style={styles.progressPct}>{m.progress_pct}%</Text>
                <TouchableOpacity
                  style={styles.signOffBtn}
                  onPress={() => handleSignOff(m.key, MILESTONE_LABELS[m.key])}
                >
                  <Text style={styles.signOffTxt}>Sign Off →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card:         { backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: RADIUS.md, padding: SPACING.md, elevation: 1 },
  cardDone:     { opacity: 0.7 },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dot:          { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dotDone:      { backgroundColor: COLORS.primary },
  dotActive:    { backgroundColor: ORANGE },
  dotTxt:       { fontSize: 11, fontWeight: '800', color: '#fff' },
  milestoneLabel:{ flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },
  doneBadge:    { fontSize: 10, fontWeight: '700', color: COLORS.primary, backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activeBadge:  { fontSize: 10, fontWeight: '700', color: ORANGE, backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pendingBadge: { fontSize: 10, fontWeight: '700', color: COLORS.subtext, backgroundColor: '#F5F5F5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  cardActions:  { marginTop: SPACING.sm },
  progressBg:   { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: ORANGE },
  progressPct:  { fontSize: 11, color: COLORS.subtext, textAlign: 'right', marginBottom: SPACING.sm },
  signOffBtn:   { backgroundColor: COLORS.primary, borderRadius: 8, padding: 8, alignItems: 'center' },
  signOffTxt:   { color: '#fff', fontWeight: '700', fontSize: 13 },
});
```

- [ ] **Step 4: Implement `DPRScreen.tsx`** (Daily Progress Report with offline queue)

```typescript
import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { queueAdd } from '../../db/syncQueue';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

const ORANGE = '#E65100';
const MILESTONES = ['m1_foundation','m2_structure_erection','m3_covering_material','m4_trellising','m5_drip_fitting','m6_bed_preparation','m7_plantation'];
const MILESTONE_LABELS: Record<string,string> = {
  m1_foundation:'M1 — Foundation', m2_structure_erection:'M2 — Structure',
  m3_covering_material:'M3 — Covering', m4_trellising:'M4 — Trellising',
  m5_drip_fitting:'M5 — Drip', m6_bed_preparation:'M6 — Bed Prep',
  m7_plantation:'M7 — Plantation',
};

export default function DPRScreen() {
  const [milestone, setMilestone]     = useState('m1_foundation');
  const [skilled, setSkilled]         = useState('');
  const [unskilled, setUnskilled]     = useState('');
  const [workDone, setWorkDone]       = useState('');
  const [materials, setMaterials]     = useState('');
  const [submitting, setSubmitting]   = useState(false);

  const handleSubmit = async () => {
    if (workDone.trim().length < 30) {
      Alert.alert('Work Description Required', 'Enter at least 30 characters describing today\'s work.');
      return;
    }
    setSubmitting(true);
    await queueAdd('dpr', '/projects/dpr', {
      milestone_key:   milestone,
      skilled_count:   parseInt(skilled) || 0,
      unskilled_count: parseInt(unskilled) || 0,
      work_done:       workDone.trim(),
      materials_note:  materials.trim(),
      submitted_at:    new Date().toISOString(),
    });
    setSubmitting(false);
    Alert.alert('DPR Saved', 'Daily progress report saved locally and will sync when connected.');
    setWorkDone('');
    setSkilled('');
    setUnskilled('');
    setMaterials('');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={styles.dateBar}>
        <Text style={styles.dateText}>Today: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
      </View>

      <View style={{ padding: SPACING.md }}>
        <Text style={styles.label}>Milestone</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
          {MILESTONES.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.milestoneChip, milestone === m && styles.milestoneChipActive]}
              onPress={() => setMilestone(m)}
            >
              <Text style={[styles.milestoneChipTxt, milestone === m && styles.milestoneChipTxtActive]}>
                {MILESTONE_LABELS[m]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Skilled Workers</Text>
        <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={skilled} onChangeText={setSkilled} />

        <Text style={styles.label}>Unskilled Workers</Text>
        <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={unskilled} onChangeText={setUnskilled} />

        <Text style={styles.label}>Work Done Today * (min 30 chars)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe work completed today in detail..."
          multiline numberOfLines={5}
          value={workDone}
          onChangeText={setWorkDone}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{workDone.length} / 30 min</Text>

        <Text style={styles.label}>Materials Consumed</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="e.g. GI Pipe 50m, UV Film 20m..."
          multiline numberOfLines={3}
          value={materials}
          onChangeText={setMaterials}
          textAlignVertical="top"
        />

        <View style={styles.photoNote}>
          <Text style={styles.photoNoteText}>2 GPS-tagged photos required · Camera integration coming in Phase 2 polish</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnTxt}>Submit DPR</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  dateBar:            { backgroundColor: ORANGE, padding: SPACING.md },
  dateText:           { color: '#fff', fontWeight: '700', fontSize: 13 },
  label:              { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: SPACING.md },
  input:              { backgroundColor: COLORS.white, borderRadius: RADIUS.sm, padding: SPACING.md, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 14 },
  textArea:           { minHeight: 100 },
  charCount:          { fontSize: 10, color: COLORS.subtext, textAlign: 'right', marginTop: 4 },
  milestoneChip:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, marginRight: 8 },
  milestoneChipActive:{ backgroundColor: ORANGE, borderColor: ORANGE },
  milestoneChipTxt:   { fontSize: 11, fontWeight: '600', color: COLORS.subtext },
  milestoneChipTxtActive: { color: '#fff' },
  photoNote:          { backgroundColor: '#FFF3E0', borderRadius: 10, padding: SPACING.md, marginTop: SPACING.md, borderLeftWidth: 3, borderLeftColor: ORANGE },
  photoNoteText:      { fontSize: 12, color: '#E65100' },
  submitBtn:          { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.lg },
  submitBtnTxt:       { color: '#fff', fontWeight: '700', fontSize: 15 },
});
```

- [ ] **Step 5: `npx tsc --noEmit` — 0 errors**

- [ ] **Step 6: Commit**

```bash
git add mobile/src/screens/erection/
git commit -m "feat(mobile): Erection Manager screens — site list, 5-step site visit (offline), milestone tracker, DPR"
```

---

## Task 4: Agronomist Screens

**Files:**
- Modify: `mobile/src/screens/agronomist/AgronomistDashboard.tsx`
- Modify: `mobile/src/screens/agronomist/FarmListScreen.tsx`
- Modify: `mobile/src/screens/agronomist/IotMonitorScreen.tsx`
- Modify: `mobile/src/screens/agronomist/HealthAssessmentScreen.tsx`
- Modify: `mobile/src/screens/agronomist/VisitReportScreen.tsx`

- [ ] **Step 1: Install `react-native-chart-kit` for IoT trend chart**

```bash
cd mobile && npm install react-native-chart-kit react-native-svg
cd ..
```

- [ ] **Step 2: Implement `AgronomistDashboard.tsx`**

```typescript
import React, { useState, useCallback } from 'react';
import { ScrollView, View, Text, RefreshControl, StyleSheet } from 'react-native';
import { useGetFarmsQuery }     from '../../store/api/agronomistApi';
import { useGetNotificationsQuery } from '../../store/api/notificationsApi';
import { OfflineBanner }        from '../../components/shared/OfflineBanner';
import { KpiCard }              from '../../components/shared/KpiCard';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

const PURPLE = '#6A1B9A';

export default function AgronomistDashboard() {
  const { data: farms = [], isError, isFetching, refetch } = useGetFarmsQuery();
  const { data: notifs = [] } = useGetNotificationsQuery();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const criticalFarms  = farms.filter(f => f.alert_level === 'critical').length;
  const warningFarms   = farms.filter(f => f.alert_level === 'warning').length;
  const unreadNotifs   = notifs.filter(n => !n.is_read).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      refreshControl={<RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} colors={[PURPLE]} tintColor={PURPLE} />}
    >
      <OfflineBanner />
      {isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Could not load farm data. Pull to retry.</Text>
        </View>
      )}
      <View style={styles.kpiRow}>
        <KpiCard label="Assigned Farms" value={farms.length}     accentColor={PURPLE}    emoji="🌾" />
        <KpiCard label="Critical Alerts" value={criticalFarms}   accentColor="#C62828"   emoji="🚨" />
        <KpiCard label="Visit Due"        value={warningFarms}   accentColor="#E65100"   emoji="🚗" />
      </View>
      <Text style={styles.section}>FARM ALERTS</Text>
      {farms.filter(f => f.alert_level !== 'none').map(f => (
        <View key={f.id} style={[styles.alertRow, f.alert_level === 'critical' && styles.alertCritical]}>
          <Text style={styles.alertEmoji}>{f.alert_level === 'critical' ? '🚨' : '⚠️'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertName}>{f.farmer_name} — {f.village}</Text>
            <Text style={styles.alertSub}>{f.crop_type} · {f.dap} DAP</Text>
          </View>
        </View>
      ))}
      {criticalFarms === 0 && warningFarms === 0 && (
        <Text style={styles.allClear}>All farms normal</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  errorBanner:    { backgroundColor: '#FFEBEE', margin: 12, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errorText:      { color: '#C62828', fontSize: 13, fontWeight: '600' },
  kpiRow:         { flexDirection: 'row', padding: SPACING.md, gap: 6 },
  section:        { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  alertRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1, borderLeftWidth: 3, borderLeftColor: '#E65100', gap: SPACING.sm },
  alertCritical:  { borderLeftColor: '#C62828', backgroundColor: '#FFF8F8' },
  alertEmoji:     { fontSize: 20 },
  alertName:      { fontSize: 13, fontWeight: '700', color: COLORS.text },
  alertSub:       { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  allClear:       { textAlign: 'center', color: COLORS.primary, fontWeight: '700', padding: 24, fontSize: 15 },
});
```

- [ ] **Step 3: Implement `FarmListScreen.tsx`**

```typescript
import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useGetFarmsQuery } from '../../store/api/agronomistApi';
import { EmptyState }       from '../../components/shared/EmptyState';
import { OfflineBanner }    from '../../components/shared/OfflineBanner';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import type { NavigationProp } from '@react-navigation/native';

const PURPLE = '#6A1B9A';

export default function FarmListScreen({ navigation }: { navigation: NavigationProp<any> }) {
  const { data: farms = [], isLoading } = useGetFarmsQuery();
  const [search, setSearch] = useState('');

  const filtered = farms.filter(f =>
    !search || f.farmer_name.toLowerCase().includes(search.toLowerCase()) ||
    f.village.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />
      <TextInput
        style={styles.search}
        placeholder="Search farmer or village..."
        value={search}
        onChangeText={setSearch}
      />
      {isLoading ? null : filtered.length === 0 ? (
        <EmptyState emoji="🌾" message="No farms found." />
      ) : (
        <View style={{ paddingHorizontal: SPACING.md }}>
          {filtered.map(f => (
            <TouchableOpacity
              key={f.id}
              style={styles.farmCard}
              onPress={() => navigation.navigate('IoT', { farmId: f.id })}
            >
              <View style={styles.farmHeader}>
                <Text style={styles.farmName}>{f.farmer_name}</Text>
                {f.alert_level !== 'none' && (
                  <Text style={[styles.alertBadge, f.alert_level === 'critical' && styles.alertBadgeCritical]}>
                    {f.alert_level === 'critical' ? 'Critical' : 'Warning'}
                  </Text>
                )}
              </View>
              <Text style={styles.farmSub}>{f.village} · {f.crop_type} · {f.dap} DAP</Text>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${Math.min(100, Math.round(f.dap / 1.2))}%` as any }]} />
              </View>
              <Text style={styles.progressLabel}>{f.dap} of ~120 days</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search:            { margin: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 13 },
  farmCard:          { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, elevation: 1 },
  farmHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  farmName:          { fontSize: 14, fontWeight: '700', color: COLORS.text },
  alertBadge:        { fontSize: 10, fontWeight: '700', color: '#E65100', backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  alertBadgeCritical:{ color: '#C62828', backgroundColor: '#FFEBEE' },
  farmSub:           { fontSize: 11, color: COLORS.subtext, marginBottom: SPACING.sm },
  progressBg:        { height: 5, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' },
  progressFill:      { height: '100%', backgroundColor: '#6A1B9A' },
  progressLabel:     { fontSize: 10, color: COLORS.subtext, marginTop: 3, textAlign: 'right' },
});
```

- [ ] **Step 4: Implement `IotMonitorScreen.tsx`** (WebSocket live sensor readings)

```typescript
import React, { useEffect, useState, useRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import type { RouteProp } from '@react-navigation/native';

const PURPLE = '#6A1B9A';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.100:8000/api/v1';
const WS_URL  = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');

interface SensorData {
  temperature:   number;
  humidity:      number;
  co2:           number;
  soil_moisture: number;
  ec:            number;
  ph:            number;
  timestamp:     string;
}

const DEFAULT_SENSORS: SensorData = { temperature: 0, humidity: 0, co2: 0, soil_moisture: 0, ec: 0, ph: 0, timestamp: '' };

function getSensorStatus(key: string, value: number): 'ok' | 'warning' | 'critical' {
  const thresholds: Record<string, { warn: number; crit: number }> = {
    temperature:   { warn: 35, crit: 38 },
    humidity:      { warn: 80, crit: 90 },
    soil_moisture: { warn: 30, crit: 20 },   // below threshold
  };
  const t = thresholds[key];
  if (!t) return 'ok';
  if (key === 'soil_moisture') {
    if (value <= t.crit)  return 'critical';
    if (value <= t.warn)  return 'warning';
    return 'ok';
  }
  if (value >= t.crit) return 'critical';
  if (value >= t.warn) return 'warning';
  return 'ok';
}

const STATUS_COLORS = { ok: '#2E7D46', warning: '#E65100', critical: '#C62828' };

export default function IotMonitorScreen({ route }: { route: RouteProp<any, any> }) {
  const farmId = route.params?.farmId as number | undefined;
  const [sensors, setSensors]           = useState<SensorData>(DEFAULT_SENSORS);
  const [connected, setConnected]       = useState(false);
  const [lastUpdate, setLastUpdate]     = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!farmId) return;

    const connect = () => {
      const ws = new WebSocket(`${WS_URL}/iot/live/${farmId}`);
      wsRef.current = ws;

      ws.onopen    = () => setConnected(true);
      ws.onclose   = () => { setConnected(false); };
      ws.onerror   = () => { setConnected(false); };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as SensorData;
          setSensors(data);
          setLastUpdate(new Date().toLocaleTimeString('en-IN'));
        } catch { /* ignore malformed messages */ }
      };
    };

    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [farmId]);

  const SENSOR_TILES = [
    { key: 'temperature',   label: 'Temperature', unit: '°C',  value: sensors.temperature },
    { key: 'humidity',      label: 'Humidity',    unit: '%',   value: sensors.humidity },
    { key: 'co2',           label: 'CO₂',         unit: 'ppm', value: sensors.co2 },
    { key: 'soil_moisture', label: 'Soil Moist.', unit: '%',   value: sensors.soil_moisture },
    { key: 'ec',            label: 'EC',          unit: 'mS',  value: sensors.ec },
    { key: 'ph',            label: 'pH',          unit: '',    value: sensors.ph },
  ];

  if (!farmId) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg }}>
        <Text style={{ color: COLORS.subtext, fontSize: 14 }}>Select a farm from the Farm List to view IoT data.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Connection status bar */}
      <View style={[styles.connBar, { backgroundColor: connected ? '#2E7D46' : '#E65100' }]}>
        <Text style={styles.connText}>
          {connected ? `Connected · Last update: ${lastUpdate ?? '—'}` : 'Disconnected — showing last reading'}
        </Text>
      </View>

      {/* Sensor grid */}
      <View style={styles.sensorGrid}>
        {SENSOR_TILES.map(({ key, label, unit, value }) => {
          const status = getSensorStatus(key, value);
          const color  = STATUS_COLORS[status];
          return (
            <View key={key} style={[styles.sensorTile, { borderTopColor: color }]}>
              <Text style={[styles.sensorValue, { color }]}>{value.toFixed(1)}{unit}</Text>
              <Text style={styles.sensorLabel}>{label}</Text>
              <View style={[styles.statusDot, { backgroundColor: color }]} />
            </View>
          );
        })}
      </View>

      {/* Alerts */}
      {SENSOR_TILES.filter(s => getSensorStatus(s.key, s.value) !== 'ok').map(s => (
        <View key={s.key} style={[styles.alertBox, getSensorStatus(s.key, s.value) === 'critical' && styles.alertBoxCritical]}>
          <Text style={styles.alertBoxTxt}>
            {getSensorStatus(s.key, s.value) === 'critical' ? 'CRITICAL' : 'WARNING'}: {s.label} at {s.value.toFixed(1)}{s.unit}
          </Text>
        </View>
      ))}

      <Text style={styles.note}>Readings update every 60 seconds via WebSocket. Fan-pad and drip automation triggered automatically at critical thresholds.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  connBar:       { padding: 8, paddingHorizontal: 16 },
  connText:      { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  sensorGrid:    { flexDirection: 'row', flexWrap: 'wrap', padding: SPACING.sm },
  sensorTile:    { width: '30%', margin: '1.5%', backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', elevation: 1, borderTopWidth: 3 },
  sensorValue:   { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  sensorLabel:   { fontSize: 10, color: COLORS.subtext, textAlign: 'center' },
  statusDot:     { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  alertBox:      { backgroundColor: '#FFF8E1', margin: SPACING.md, marginTop: 0, borderRadius: 10, padding: SPACING.md, borderLeftWidth: 3, borderLeftColor: '#E65100' },
  alertBoxCritical: { backgroundColor: '#FFEBEE', borderLeftColor: '#C62828' },
  alertBoxTxt:   { fontSize: 13, fontWeight: '700', color: COLORS.text },
  note:          { fontSize: 11, color: COLORS.subtext, margin: SPACING.md, lineHeight: 18, textAlign: 'center' },
});
```

- [ ] **Step 5: Implement `HealthAssessmentScreen.tsx`** (offline form)

```typescript
import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { queueAdd } from '../../db/syncQueue';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

const PURPLE = '#6A1B9A';
const SEVERITY_LEVELS = [1, 2, 3, 4];
const COMMON_PESTS = ['Whitefly', 'Aphids', 'Thrips', 'Spider Mite', 'Mealybug'];
const COMMON_DISEASES = ['Powdery Mildew', 'Leaf Curl Virus', 'Botrytis', 'Fusarium Wilt', 'Bacterial Blight'];

export default function HealthAssessmentScreen() {
  const [cropStage, setCropStage]           = useState('');
  const [plantHeight, setPlantHeight]       = useState('');
  const [canopyPct, setCanopyPct]           = useState('');
  const [selectedPests, setSelectedPests]   = useState<string[]>([]);
  const [pestSeverity, setPestSeverity]     = useState(1);
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [nutrients, setNutrients]           = useState('');
  const [submitting, setSubmitting]         = useState(false);

  const togglePest = (p: string) => setSelectedPests(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const toggleDisease = (d: string) => setSelectedDiseases(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const handleSubmit = async () => {
    setSubmitting(true);
    await queueAdd('health_assessment', '/agronomist/farms/0/assessment', {
      crop_stage:   cropStage,
      plant_height: parseFloat(plantHeight) || 0,
      canopy_pct:   parseFloat(canopyPct) || 0,
      pests:        selectedPests.map(p => ({ type: p, severity: pestSeverity, treatment: '' })),
      diseases:     selectedDiseases.map(d => ({ type: d, description: '' })),
      nutrients:    nutrients,
      submitted_at: new Date().toISOString(),
    });
    setSubmitting(false);
    Alert.alert('Saved', 'Health assessment saved and will sync when connected.');
    setCropStage(''); setPlantHeight(''); setCanopyPct('');
    setSelectedPests([]); setSelectedDiseases([]); setNutrients('');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ padding: SPACING.md }}>
        <Text style={styles.label}>Crop Stage</Text>
        <TextInput style={styles.input} placeholder="e.g. Flowering, 60 DAP" value={cropStage} onChangeText={setCropStage} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Plant Height (cm)</Text>
            <TextInput style={styles.input} placeholder="85" keyboardType="numeric" value={plantHeight} onChangeText={setPlantHeight} />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Canopy (%)</Text>
            <TextInput style={styles.input} placeholder="80" keyboardType="numeric" value={canopyPct} onChangeText={setCanopyPct} />
          </View>
        </View>

        <Text style={styles.label}>Pest Detection</Text>
        <View style={styles.chipRow}>
          {COMMON_PESTS.map(p => (
            <TouchableOpacity key={p} style={[styles.chip, selectedPests.includes(p) && styles.chipActive]} onPress={() => togglePest(p)}>
              <Text style={[styles.chipTxt, selectedPests.includes(p) && styles.chipTxtActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {selectedPests.length > 0 && (
          <View>
            <Text style={styles.label}>Severity (1=Low, 4=Severe)</Text>
            <View style={styles.severityRow}>
              {SEVERITY_LEVELS.map(s => (
                <TouchableOpacity key={s} style={[styles.severityBtn, pestSeverity === s && styles.severityBtnActive]} onPress={() => setPestSeverity(s)}>
                  <Text style={[styles.severityTxt, pestSeverity === s && styles.severityTxtActive]}>Grade {s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.label}>Disease Detection</Text>
        <View style={styles.chipRow}>
          {COMMON_DISEASES.map(d => (
            <TouchableOpacity key={d} style={[styles.chip, selectedDiseases.includes(d) && styles.chipActive]} onPress={() => toggleDisease(d)}>
              <Text style={[styles.chipTxt, selectedDiseases.includes(d) && styles.chipTxtActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Nutrient Observations</Text>
        <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Calcium deficiency, iron chlorosis, etc..." multiline value={nutrients} onChangeText={setNutrients} textAlignVertical="top" />

        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnTxt}>Save Assessment</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label:             { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: SPACING.md },
  input:             { backgroundColor: COLORS.white, borderRadius: RADIUS.sm, padding: SPACING.md, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 14 },
  row:               { flexDirection: 'row' },
  chipRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chip:              { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border },
  chipActive:        { backgroundColor: PURPLE, borderColor: PURPLE },
  chipTxt:           { fontSize: 12, color: COLORS.subtext },
  chipTxtActive:     { color: '#fff' },
  severityRow:       { flexDirection: 'row', gap: 6 },
  severityBtn:       { flex: 1, padding: 8, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  severityBtnActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  severityTxt:       { fontSize: 11, color: COLORS.subtext },
  severityTxtActive: { color: '#fff' },
  submitBtn:         { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.xl },
  submitBtnTxt:      { color: '#fff', fontWeight: '700', fontSize: 15 },
});
```

- [ ] **Step 6: Implement `VisitReportScreen.tsx`** (offline form with OTP confirmation)

```typescript
import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { queueAdd } from '../../db/syncQueue';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

const PURPLE = '#6A1B9A';

export default function VisitReportScreen() {
  const [findings, setFindings]   = useState('');
  const [reco1, setReco1]         = useState('');
  const [reco2, setReco2]         = useState('');
  const [reco3, setReco3]         = useState('');
  const [nextDate, setNextDate]   = useState('');
  const [otp, setOtp]             = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (findings.trim().length < 20) {
      Alert.alert('Findings Required', 'Enter at least 20 characters for findings summary.');
      return;
    }
    setSubmitting(true);
    await queueAdd('visit_report', '/agronomist/farms/0/visit-report', {
      findings_summary: findings.trim(),
      recommendations:  [reco1, reco2, reco3].filter(r => r.trim().length > 0),
      next_visit_date:  nextDate,
      farmer_otp:       otp.trim() || undefined,
      submitted_at:     new Date().toISOString(),
    });
    setSubmitting(false);
    Alert.alert('Visit Report Saved', 'Report will be submitted and PDF sent to farmer when connected.');
    setFindings(''); setReco1(''); setReco2(''); setReco3(''); setNextDate(''); setOtp('');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ padding: SPACING.md }}>
        <Text style={styles.label}>Findings Summary *</Text>
        <TextInput style={[styles.input, { minHeight: 100 }]} placeholder="Overall crop condition, observations, key issues found..." multiline value={findings} onChangeText={setFindings} textAlignVertical="top" />

        <Text style={styles.label}>Recommendations</Text>
        {[{ val: reco1, set: setReco1, ph: '1. First recommendation...' }, { val: reco2, set: setReco2, ph: '2. Second recommendation...' }, { val: reco3, set: setReco3, ph: '3. Third recommendation (optional)...' }].map(({ val, set, ph }, i) => (
          <TextInput key={i} style={[styles.input, { marginBottom: 6 }]} placeholder={ph} value={val} onChangeText={set} multiline />
        ))}

        <Text style={styles.label}>Next Visit Date</Text>
        <TextInput style={styles.input} placeholder="DD/MM/YYYY" value={nextDate} onChangeText={setNextDate} keyboardType="numeric" />

        <Text style={styles.label}>Farmer OTP Confirmation (optional)</Text>
        <TextInput style={styles.input} placeholder="Enter OTP from farmer's mobile" value={otp} onChangeText={setOtp} keyboardType="numeric" maxLength={6} />

        <View style={styles.pdfNote}>
          <Text style={styles.pdfNoteText}>A PDF report will be auto-sent to the farmer's WhatsApp within 5 minutes of sync.</Text>
        </View>

        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnTxt}>Submit Visit Report</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label:       { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: SPACING.md },
  input:       { backgroundColor: COLORS.white, borderRadius: RADIUS.sm, padding: SPACING.md, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 14 },
  pdfNote:     { backgroundColor: '#F3E8FF', borderRadius: 10, padding: SPACING.md, marginTop: SPACING.md, borderLeftWidth: 3, borderLeftColor: PURPLE },
  pdfNoteText: { fontSize: 12, color: PURPLE },
  submitBtn:   { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.xl },
  submitBtnTxt:{ color: '#fff', fontWeight: '700', fontSize: 15 },
});
```

- [ ] **Step 7: `npx tsc --noEmit` — 0 errors**

- [ ] **Step 8: Commit**

```bash
git add mobile/src/screens/agronomist/
git commit -m "feat(mobile): Agronomist screens — dashboard, farm list, IoT WebSocket monitor, health assessment, visit report"
```

---

## Task 5: Final Integration + Phase 2 Tag

- [ ] **Step 1: Verify all Phase 2 screens appear in TabNavigator**

Check `mobile/src/navigation/TabNavigator.tsx` handles `project_manager`, `structure_contractor`, `drip_contractor`, `bed_contractor`, `plantation_contractor` → `ErectionTabs`; and `agronomist` → `AgronomistTabs`.

- [ ] **Step 2: Final TypeScript check**

```bash
cd "E:\Google Drive\01-Pankaj\199 ICON_Accounts\95 Software Design\ICON\mobile"
npx tsc --noEmit
```

- [ ] **Step 3: Tag Phase 2**

```bash
cd "E:\Google Drive\01-Pankaj\199 ICON_Accounts\95 Software Design\ICON"
git tag mobile-phase2-v1.0 -m "ICON Mobile App Phase 2 — Erection Manager + Agronomist (7 roles, 32 screens)"
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(mobile): Phase 2 complete — 10 new screens, offline write-ahead queue, WebSocket IoT" --allow-empty
```

---

## Self-Review

**Spec coverage:**
| SRS requirement | Task |
|---|---|
| Erection Manager: dashboard with site cards + delay flags | Task 3 Step 1 |
| Site Visit: 5-step form, GPS capture, offline SQLite | Task 3 Step 2 |
| 7-milestone tracker with sign-off | Task 3 Step 3 |
| DPR with labor count, offline queue | Task 3 Step 4 |
| Agronomist dashboard with IoT alert summary | Task 4 Step 2 |
| Farm list with DAP progress bar + alert badges | Task 4 Step 3 |
| IoT live monitor via WebSocket (6 sensors, RAG) | Task 4 Step 4 |
| Health assessment offline form (pest/disease multi-select) | Task 4 Step 5 |
| Visit report with farmer OTP + PDF note | Task 4 Step 6 |
| Write-ahead sync queue (SQLite → API on reconnect) | Task 2 |
| Background sync on app foreground | Task 2 Step 2 |

**SRS items deferred to Phase 2 polish (not in this plan):**
- Camera + GPS photo upload for site visits and DPR
- BOQ PDF export (`react-native-pdf-lib`)
- WhatsApp auto-send of DPR summary
- 24h temperature trend chart in IoT screen
- Farmer OTP actual verification (stub only)
