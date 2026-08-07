import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { Text } from 'react-native';
import AgronomistDashboard    from '../../screens/agronomist/AgronomistDashboard';
import FarmListScreen         from '../../screens/agronomist/FarmListScreen';
import IotMonitorScreen       from '../../screens/agronomist/IotMonitorScreen';
import HealthAssessmentScreen from '../../screens/agronomist/HealthAssessmentScreen';
import VisitReportScreen      from '../../screens/agronomist/VisitReportScreen';
import NotificationsScreen    from '../../screens/shared/NotificationsScreen';
import ProfileScreen          from '../../screens/shared/ProfileScreen';
import type { AgronomistStackParamList } from '../types';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator<AgronomistStackParamList>();
const ico   = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;
const PURPLE = '#6A1B9A';

const hdrOpts = { headerStyle: { backgroundColor: PURPLE }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' as const } };

// IoT/Assessment/VisitReport all need to know which farm — nested as a stack
// (not flat tabs) so they can receive { farmId } via navigation params, the
// same pattern LoanTabs' CasesStack uses for screens that need an id.
function FarmsStack() {
  return (
    <Stack.Navigator screenOptions={hdrOpts}>
      <Stack.Screen name="Farms"       component={FarmListScreen}         options={{ title: 'My Farms' }} />
      <Stack.Screen name="IoT"         component={IotMonitorScreen}       options={{ title: 'IoT Live' }} />
      <Stack.Screen name="Assessment"  component={HealthAssessmentScreen} options={{ title: 'Health Assessment' }} />
      <Stack.Screen name="VisitReport" component={VisitReportScreen}      options={{ title: 'Visit Report' }} />
    </Stack.Navigator>
  );
}

export default function AgronomistTabs() {
  return (
    <Tab.Navigator screenOptions={{
      tabBarActiveTintColor:   PURPLE,
      tabBarInactiveTintColor: '#757575',
      headerStyle:             { backgroundColor: PURPLE },
      headerTintColor:         '#fff',
      headerTitleStyle:        { fontWeight: '700' },
    }}>
      <Tab.Screen name="Home"   component={AgronomistDashboard} options={{ title: 'Dashboard', tabBarIcon: ico('🌱') }} />
      {/* "FarmsTab" (not "Farms") — the nested stack's first screen is already
          named "Farms"; duplicate nested names make navigate('Farms') ambiguous
          and trigger a React Navigation warning. Same reason LoanTabs wraps its
          "Pipeline" screen in a "Cases" tab. */}
      <Tab.Screen name="FarmsTab" component={FarmsStack}        options={{ title: 'My Farms',  tabBarIcon: ico('🌾'), headerShown: false }} />
      <Tab.Screen name="Alerts"  component={NotificationsScreen} options={{ title: 'Alerts',    tabBarIcon: ico('🔔') }} />
      <Tab.Screen name="Profile" component={ProfileScreen}       options={{ title: 'Profile',   tabBarIcon: ico('👤') }} />
    </Tab.Navigator>
  );
}
