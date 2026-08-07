import { StackScreenProps } from '@react-navigation/stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// ── Root Stack ───────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Main:  undefined;
  Login: undefined;
};

// ── Loan tab stack (nested stack inside the tab) ─────────────────────────────
// Screen names must match the Stack.Screen name= values in LoanTabs.tsx
export type LoanStackParamList = {
  Pipeline:      { initialStage?: string } | undefined;
  LoanDetail:    { id: number };
  Disbursement:  { id: number };
  BankFollowUp:  undefined;
  ProjectDetail: { id: number };
};

// ── Dealer tab stack ─────────────────────────────────────────────────────────
export type DealerStackParamList = {
  DealerHome:          undefined;
  DealerFarmers:       undefined;
  AddFarmer:           undefined;
  DealerProjectDetail: { id: number };
};

// ── KYC stack (inside Office tabs) ──────────────────────────────────────────
// Screen names must match the Stack.Screen name= values in OfficeTabs.tsx
export type OfficeStackParamList = {
  DocInbox:      undefined;
  KycReview:     { docId?: number };
  ProjectDetail: { id: number };
};

// ── Agronomist stack (inside Agronomist tabs) ────────────────────────────────
// Screen names must match the Stack.Screen name= values in AgronomistTabs.tsx.
// IoT/Assessment/VisitReport all require a farmId — there is no "current farm"
// context, so it must come from navigation params, not a hardcoded value.
export type AgronomistStackParamList = {
  Farms:        undefined;
  IoT:          { farmId: number };
  Assessment:   { farmId: number };
  VisitReport:  { farmId: number };
};

// ── Shared screen props helpers ───────────────────────────────────────────────
export type KycReviewScreenProps       = StackScreenProps<OfficeStackParamList, 'KycReview'>;
export type LoanDetailScreenProps      = StackScreenProps<LoanStackParamList, 'LoanDetail'>;
export type DisbursementScreenProps    = StackScreenProps<LoanStackParamList, 'Disbursement'>;
export type FarmerPipelineScreenProps  = StackScreenProps<LoanStackParamList, 'Pipeline'>;
export type DealerFarmersScreenProps   = StackScreenProps<DealerStackParamList, 'DealerFarmers'>;
export type AddFarmerScreenProps       = StackScreenProps<DealerStackParamList, 'AddFarmer'>;
export type AssessmentScreenProps      = StackScreenProps<AgronomistStackParamList, 'Assessment'>;
export type VisitReportScreenProps     = StackScreenProps<AgronomistStackParamList, 'VisitReport'>;

// Suppress unused-import warning for BottomTabScreenProps (reserved for Phase 2)
export type { BottomTabScreenProps };
