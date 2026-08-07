import React from 'react';
import { useAuthContext } from '../context/AuthContext';
import { ROLES, isErectionRole } from '../constants/roles';
import OfficeTabs     from './tabs/OfficeTabs';
import LoanTabs       from './tabs/LoanTabs';
import AdminTabs      from './tabs/AdminTabs';
import DealerTabs     from './tabs/DealerTabs';
import FarmerTabs     from './tabs/FarmerTabs';
import ErectionTabs   from './tabs/ErectionTabs';
import AgronomistTabs from './tabs/AgronomistTabs';
import AccessDeniedScreen from '../screens/shared/AccessDeniedScreen';

/**
 * Role → tab shell. Uses ROLES constants only (never bare "manager").
 * agency_officer shares LoanTabs (pipeline + cases) with bank_officer;
 * LoanDashboard switches panel by JWT role via /role-kpis.
 */
export default function TabNavigator() {
  const { user } = useAuthContext();
  const role = user?.role;

  switch (role) {
    case ROLES.OFFICE_STAFF:
      return <OfficeTabs />;
    case ROLES.BANK_OFFICER:
    case ROLES.AGENCY_OFFICER:
      return <LoanTabs />;
    case ROLES.ADMIN:
    case ROLES.OWNER:
      return <AdminTabs />;
    case ROLES.DEALER:
      return <DealerTabs />;
    case ROLES.FARMER:
      return <FarmerTabs />;
    case ROLES.AGRONOMIST:
      return <AgronomistTabs />;
    default:
      if (isErectionRole(role)) return <ErectionTabs />;
      return <AccessDeniedScreen role={role} />;
  }
}
