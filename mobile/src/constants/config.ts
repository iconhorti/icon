// ════════════════════════════════════════════════════════════════════════════
// Central runtime config. Single source for the API base URL so it isn't
// duplicated (and drifting) across baseApi, AuthContext, and the sync queue.
//
// Set EXPO_PUBLIC_API_URL in your env / app config for real builds; the LAN
// fallback is dev-only.
// ════════════════════════════════════════════════════════════════════════════

export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.100:8000/api/v1';
