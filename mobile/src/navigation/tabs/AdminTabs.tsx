import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { COLORS } from '../../constants/theme';
import AdminDashboard      from '../../screens/admin/AdminDashboard';
import ProjectOverview     from '../../screens/admin/ProjectOverviewScreen';
import NotificationsScreen from '../../screens/shared/NotificationsScreen';
import ProfileScreen       from '../../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const ico = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;

export default function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{
      tabBarActiveTintColor:   '#C8972A',
      tabBarInactiveTintColor: COLORS.subtext,
      headerStyle:             { backgroundColor: '#C8972A' },
      headerTintColor:         COLORS.white,
      headerTitleStyle:        { fontWeight: '700' },
    }}>
      <Tab.Screen name="Home"     component={AdminDashboard}   options={{ title: 'Dashboard', tabBarIcon: ico('🏠') }} />
      <Tab.Screen name="Projects" component={ProjectOverview}  options={{ title: 'Projects',  tabBarIcon: ico('📊') }} />
      <Tab.Screen name="Alerts"   component={NotificationsScreen} options={{ title: 'Alerts', tabBarIcon: ico('🔔') }} />
      <Tab.Screen name="Profile"  component={ProfileScreen}    options={{ title: 'Profile',   tabBarIcon: ico('👤') }} />
    </Tab.Navigator>
  );
}
