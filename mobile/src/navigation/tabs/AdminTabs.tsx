import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { Text } from 'react-native';
import { COLORS } from '../../constants/theme';
import AdminDashboard          from '../../screens/admin/AdminDashboard';
import ProjectOverviewScreen   from '../../screens/admin/ProjectOverviewScreen';
import UserManagementScreen    from '../../screens/admin/UserManagementScreen';
import SystemConfigScreen      from '../../screens/admin/SystemConfigScreen';
import AllAlertsScreen         from '../../screens/admin/AllAlertsScreen';
import ProjectDetailScreen     from '../../screens/shared/ProjectDetailScreen';
import NotificationsScreen     from '../../screens/shared/NotificationsScreen';
import ProfileScreen           from '../../screens/shared/ProfileScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();
const ico   = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;

const hdrOpts = { headerStyle: { backgroundColor: '#C8972A' }, headerTintColor: COLORS.white, headerTitleStyle: { fontWeight: '700' as const } };

function ProjectsStack() {
  return (
    <Stack.Navigator screenOptions={hdrOpts}>
      <Stack.Screen name="Overview"      component={ProjectOverviewScreen} options={{ title: 'Projects' }} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen}   options={{ title: 'Project Detail' }} />
    </Stack.Navigator>
  );
}

export default function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#C8972A', tabBarInactiveTintColor: COLORS.subtext, ...hdrOpts }}>
      <Tab.Screen name="Home"     component={AdminDashboard}       options={{ title: 'Dashboard', tabBarIcon: ico('🏠') }} />
      <Tab.Screen name="Projects" component={ProjectsStack}        options={{ title: 'Projects',  tabBarIcon: ico('📊'), headerShown: false }} />
      <Tab.Screen name="Users"    component={UserManagementScreen} options={{ title: 'Users',     tabBarIcon: ico('👥') }} />
      <Tab.Screen name="Alerts"   component={AllAlertsScreen}      options={{ title: 'Alerts',    tabBarIcon: ico('🔔') }} />
      <Tab.Screen name="Profile"  component={ProfileScreen}        options={{ title: 'Profile',   tabBarIcon: ico('👤') }} />
    </Tab.Navigator>
  );
}
