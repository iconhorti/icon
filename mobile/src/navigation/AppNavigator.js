/**
 * Root navigator — switches between Auth stack and role-specific tab navigators.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/UI';
import { colors, font } from '../styles/theme';

// Auth
import LoginScreen from '../screens/shared/LoginScreen';

// Shared
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ProfileScreen       from '../screens/shared/ProfileScreen';

// Dealer
import DealerDashboard     from '../screens/dealer/DealerDashboard';
import DealerFarmerList    from '../screens/dealer/DealerFarmerList';
import RegisterFarmer      from '../screens/dealer/RegisterFarmer';
import DealerProjectList   from '../screens/dealer/DealerProjectList';
import CreateProject       from '../screens/dealer/CreateProject';

// Farmer
import FarmerDashboard     from '../screens/farmer/FarmerDashboard';
import FarmerProjectDetail from '../screens/farmer/FarmerProjectDetail';

// Admin / Office Staff
import AdminDashboard      from '../screens/admin/AdminDashboard';
import ProjectList         from '../screens/admin/ProjectList';
import ProjectDetail       from '../screens/admin/ProjectDetail';
import DocumentVerify      from '../screens/admin/DocumentVerify';

// Common (shared across roles)
import DocumentUpload      from '../screens/shared/DocumentUpload';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Shared header options ─────────────────────────────────────────────────────
const headerStyle = {
  headerStyle:     { backgroundColor: colors.primary },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: font.bold },
};

// ── Tab icon helper ───────────────────────────────────────────────────────────
const TabIcon = ({ emoji, label, focused }) => (
  <View style={{ alignItems: 'center' }}>
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
    <Text style={{ fontSize: 10, color: focused ? colors.primary : colors.textMuted,
      fontWeight: focused ? font.semi : font.reg }}>{label}</Text>
  </View>
);

// ── DEALER TABS ───────────────────────────────────────────────────────────────
function DealerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarShowLabel: false }}>
      <Tab.Screen name="DHome"    component={DealerStack}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} /> }} />
      <Tab.Screen name="DFarmers" component={FarmerStack}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🌾" label="Farmers" focused={focused} /> }} />
      <Tab.Screen name="DProjects" component={ProjectStack}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📁" label="Projects" focused={focused} /> }} />
      <Tab.Screen name="DNotifications" component={NotificationsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" label="Alerts" focused={focused} /> }} />
      <Tab.Screen name="DProfile" component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

function DealerStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="DealerDashboard" component={DealerDashboard} options={{ title: 'ICON — Dealer' }} />
    </Stack.Navigator>
  );
}

function FarmerStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="DealerFarmerList" component={DealerFarmerList} options={{ title: 'My Farmers' }} />
      <Stack.Screen name="RegisterFarmer"   component={RegisterFarmer}   options={{ title: 'Register Farmer' }} />
      <Stack.Screen name="DocumentUpload"   component={DocumentUpload}   options={{ title: 'Upload Document' }} />
    </Stack.Navigator>
  );
}

function ProjectStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="DealerProjectList" component={DealerProjectList} options={{ title: 'My Projects' }} />
      <Stack.Screen name="CreateProject"     component={CreateProject}     options={{ title: 'New Project' }} />
      <Stack.Screen name="DocumentUpload"    component={DocumentUpload}    options={{ title: 'Upload Document' }} />
    </Stack.Navigator>
  );
}

// ── FARMER TABS ───────────────────────────────────────────────────────────────
function FarmerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarShowLabel: false }}>
      <Tab.Screen name="FHome" component={FarmerHomeStack}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} /> }} />
      <Tab.Screen name="FNotifications" component={NotificationsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" label="Alerts" focused={focused} /> }} />
      <Tab.Screen name="FProfile" component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

function FarmerHomeStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="FarmerDashboard"     component={FarmerDashboard}     options={{ title: 'My Project' }} />
      <Stack.Screen name="FarmerProjectDetail" component={FarmerProjectDetail} options={{ title: 'Project Details' }} />
    </Stack.Navigator>
  );
}

// ── ADMIN / OFFICE STAFF TABS ─────────────────────────────────────────────────
function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarShowLabel: false }}>
      <Tab.Screen name="AHome" component={AdminHomeStack}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} /> }} />
      <Tab.Screen name="AProjects" component={AdminProjectStack}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📁" label="Projects" focused={focused} /> }} />
      <Tab.Screen name="ANotifications" component={NotificationsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" label="Alerts" focused={focused} /> }} />
      <Tab.Screen name="AProfile" component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

function AdminHomeStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ title: 'ICON — Admin' }} />
    </Stack.Navigator>
  );
}

function AdminProjectStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="ProjectList"     component={ProjectList}     options={{ title: 'All Projects' }} />
      <Stack.Screen name="ProjectDetail"   component={ProjectDetail}   options={{ title: 'Project' }} />
      <Stack.Screen name="DocumentVerify"  component={DocumentVerify}  options={{ title: 'Verify Documents' }} />
      <Stack.Screen name="DocumentUpload"  component={DocumentUpload}  options={{ title: 'Upload Document' }} />
    </Stack.Navigator>
  );
}

// ── ROOT NAVIGATOR ────────────────────────────────────────────────────────────
const ADMIN_ROLES    = ['admin', 'owner'];
const STAFF_ROLES    = ['office_staff', 'project_manager', 'bank_officer', 'agency_officer', 'agronomist'];

function RoleNavigator() {
  const { user } = useAuth();
  const role = user?.role;

  if (role === 'dealer')             return <DealerTabs />;
  if (role === 'farmer')             return <FarmerTabs />;
  if (ADMIN_ROLES.includes(role))    return <AdminTabs />;
  if (STAFF_ROLES.includes(role))    return <AdminTabs />;
  // Contractors → simplified admin view for now
  return <AdminTabs />;
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen message="Loading ICON…" />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user
          ? <Stack.Screen name="App"   component={RoleNavigator} />
          : <Stack.Screen name="Login" component={LoginScreen}   />
        }
      </Stack.Navigator>
    </NavigationContainer>
  );
}
