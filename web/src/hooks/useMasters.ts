import { useQuery } from '@tanstack/react-query';
import {
  getComponents, getAreaTypes, getAgencies, getBanks, getBankBranches, getSkills,
  getStates, getDistricts, getTalukas, getVillages,
} from '../api/client';
import { qk } from '../lib/queryClient';

// ─── Standard lookup tabs ─────────────────────────────────────────────────────
const LOOKUP_LOADERS: Record<string, () => Promise<any>> = {
  components:    () => getComponents(null, false),
  area_types:    () => getAreaTypes(true),
  agencies:      () => getAgencies(),
  banks:         () => getBanks(),
  bank_branches: () => getBankBranches(),
  skills:        () => getSkills(),
};

export function useLookup(tab: string, enabled = true) {
  return useQuery<any[]>({
    queryKey: qk.lookup(tab),
    queryFn: async () => {
      const data = await LOOKUP_LOADERS[tab]();
      return Array.isArray(data) ? data : [];
    },
    enabled: enabled && tab in LOOKUP_LOADERS,
  });
}

// ─── Location levels ──────────────────────────────────────────────────────────
const LOC_GET: Record<string, (filter: any) => Promise<any>> = {
  states:    () => getStates(),
  districts: (f) => getDistricts(f.state_id),
  talukas:   (f) => getTalukas(f.district_id),
  villages:  (f) => getVillages(f.taluka_id),
};

export function useLocationLevel(level: string, filter: Record<string, any>, enabled = true) {
  return useQuery<any[]>({
    queryKey: qk.locations(level, filter),
    queryFn: async () => {
      const data = await LOC_GET[level](filter);
      return Array.isArray(data) ? data : [];
    },
    enabled,
  });
}
