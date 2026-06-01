import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { Text } from 'react-native';
import { COLORS } from '../../constants/theme';
import AdminDashboard          from '../../screens/admin/AdminDashboard';
import PipelineListScreen      from '../../screens/admin/PipelineListScreen';
import ProjectOverviewScreen   from '../../screens/admin/ProjectOverviewScreen';
import UserManagementScreen    from '../../screens/admin/UserManagementScreen';
import AllAlertsScreen         from '../../screens/admin/AllAlertsScreen';
import ProjectDetailScreen     from '../../screens/shared/ProjectDetailScreen';
import NotificationsScreen     from '../../screens/shared/NotificationsScreen';
import ProfileScreen           from '../../screens/shared/ProfileScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();
const ico   = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;

const hdrOpts = {
  headerStyle:      { backgroundColor: '#C8972A' },
  headerTintColor:  COLORS.white,
  headerTitleStyle: { fontWeight: '700' as const },
};

// Home stack: Dashboard → PipelineList (filtered project list on KPI tap)
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={hdrOpts}>
      <Stack.Screen name="Dashboard"    component={AdminDashboard}    options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="PipelineList" component={PipelineListScreen} options={({ route }) => ({
        title: (route.params as any)?.title ?? 'Cases',
      })} />
    </Stack.Navigator>
  );
}

// Projects stack: Overview → ProjectDetail
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
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor:   '#C8972A',
        tabBarInactiveTintColor: COLORS.subtext,
        headerShown:             false,   // each stack manages its own header
      }}
    >
      <Tab.Screen name="Home"     component={HomeStack}            options={{ title: 'Dashboard', tabBarIcon: ico('🏠') }} />
      <Tab.Screen name="Projects" component={ProjectsStack}        options={{ title: 'Projects',  tabBarIcon: ico('📊') }} />
      <Tab.Screen name="Users"    component={UserManagementScreen} options={{ title: 'Users',     tabBarIcon: ico('👥') }} />
      <Tab.Screen name="Alerts"   component={AllAlertsScreen}      options={{ title: 'Alerts',    tabBarIcon: ico('🔔') }} />
      <Tab.Screen name="Profile"  component={ProfileScreen}        options={{ title: 'Profile',   tabBarIcon: ico('👤') }} />
    </Tab.Navigator>
  );
}
