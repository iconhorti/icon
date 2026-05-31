import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { Text } from 'react-native';
import { COLORS } from '../../constants/theme';
import LoanDashboard           from '../../screens/loan/LoanDashboard';
import FarmerPipelineScreen    from '../../screens/loan/FarmerPipelineScreen';
import LoanApplicationScreen   from '../../screens/loan/LoanApplicationScreen';
import DisbursementScreen      from '../../screens/loan/DisbursementScreen';
import BankFollowUpScreen      from '../../screens/loan/BankFollowUpScreen';
import ProjectDetailScreen     from '../../screens/shared/ProjectDetailScreen';
import NotificationsScreen     from '../../screens/shared/NotificationsScreen';
import ProfileScreen           from '../../screens/shared/ProfileScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();
const ico   = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;

const hdrOpts = { headerStyle: { backgroundColor: '#1565C0' }, headerTintColor: COLORS.white, headerTitleStyle: { fontWeight: '700' as const } };

function CasesStack() {
  return (
    <Stack.Navigator screenOptions={hdrOpts}>
      <Stack.Screen name="Pipeline"      component={FarmerPipelineScreen}  options={{ title: 'Cases' }} />
      <Stack.Screen name="LoanDetail"    component={LoanApplicationScreen} options={{ title: 'Loan Details' }} />
      <Stack.Screen name="Disbursement"  component={DisbursementScreen}    options={{ title: 'Disbursement' }} />
      <Stack.Screen name="BankFollowUp"  component={BankFollowUpScreen}    options={{ title: 'Bank Follow-up' }} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen}   options={{ title: 'Project Detail' }} />
    </Stack.Navigator>
  );
}

export default function LoanTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#1565C0', tabBarInactiveTintColor: COLORS.subtext, headerStyle: { backgroundColor: '#1565C0' }, headerTintColor: COLORS.white, headerTitleStyle: { fontWeight: '700' as const } }}>
      <Tab.Screen name="Home"    component={LoanDashboard}       options={{ title: 'Home',    tabBarIcon: ico('🏠') }} />
      <Tab.Screen name="Cases"   component={CasesStack}          options={{ title: 'Cases',   tabBarIcon: ico('👩‍🌾'), headerShown: false }} />
      <Tab.Screen name="Alerts"  component={NotificationsScreen} options={{ title: 'Alerts',  tabBarIcon: ico('🔔') }} />
      <Tab.Screen name="Profile" component={ProfileScreen}       options={{ title: 'Profile', tabBarIcon: ico('👤') }} />
    </Tab.Navigator>
  );
}
