import React from 'react';
import { useAuthContext } from '../context/AuthContext';
import OfficeTabs     from './tabs/OfficeTabs';
import LoanTabs       from './tabs/LoanTabs';
import AdminTabs      from './tabs/AdminTabs';
import DealerTabs     from './tabs/DealerTabs';
import FarmerTabs     from './tabs/FarmerTabs';
import ErectionTabs   from './tabs/ErectionTabs';
import AgronomistTabs from './tabs/AgronomistTabs';
import AccessDeniedScreen from '../screens/shared/AccessDeniedScreen';

export default function TabNavigator() {
  const { user } = useAuthContext();
  switch (user?.role) {
    case 'office_staff':  return <OfficeTabs />;
    case 'bank_officer':  return <LoanTabs />;
    case 'admin':
    case 'owner':         return <AdminTabs />;
    case 'dealer':        return <DealerTabs />;
    case 'farmer':        return <FarmerTabs />;
    case 'project_manager':
    case 'structure_contractor':
    case 'drip_contractor':
    case 'bed_contractor':
    case 'plantation_contractor': return <ErectionTabs />;
    case 'agronomist':             return <AgronomistTabs />;
    default:              return <AccessDeniedScreen role={user?.role} />;
  }
}
