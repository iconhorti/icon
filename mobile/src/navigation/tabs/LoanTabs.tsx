import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { COLORS } from '../../constants/theme';
import LoanDashboard        from '../../screens/loan/LoanDashboard';
import FarmerPipelineScreen from '../../screens/loan/FarmerPipelineScreen';
import NotificationsScreen  from '../../screens/shared/NotificationsScreen';
import ProfileScreen        from '../../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const ico = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;

export default function LoanTabs() {
  return (
    <Tab.Navigator screenOptions={{
      tabBarActiveTintColor:   '#1565C0',
      tabBarInactiveTintColor: COLORS.subtext,
      headerStyle:             { backgroundColor: '#1565C0' },
      headerTintColor:         COLORS.white,
      headerTitleStyle:        { fontWeight: '700' },
    }}>
      <Tab.Screen name="Home"    component={LoanDashboard}        options={{ title: 'Home',    tabBarIcon: ico('🏠') }} />
      <Tab.Screen name="Cases"   component={FarmerPipelineScreen} options={{ title: 'Cases',   tabBarIcon: ico('👩‍🌾') }} />
      <Tab.Screen name="Alerts"  component={NotificationsScreen}  options={{ title: 'Alerts',  tabBarIcon: ico('🔔') }} />
      <Tab.Screen name="Profile" component={ProfileScreen}        options={{ title: 'Profile', tabBarIcon: ico('👤') }} />
    </Tab.Navigator>
  );
}
