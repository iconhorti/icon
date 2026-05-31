import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { Text } from 'react-native';
import { COLORS } from '../../constants/theme';
import DealerDashboard     from '../../screens/dealer/DealerDashboard';
import DealerFarmersScreen from '../../screens/dealer/DealerFarmersScreen';
import AddFarmerScreen     from '../../screens/dealer/AddFarmerScreen';
import ProjectDetailScreen from '../../screens/shared/ProjectDetailScreen';
import NotificationsScreen from '../../screens/shared/NotificationsScreen';
import ProfileScreen       from '../../screens/shared/ProfileScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();
const ico   = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;

const hdrOpts = { headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: COLORS.white, headerTitleStyle: { fontWeight: '700' as const } };

function FarmersStack() {
  return (
    <Stack.Navigator screenOptions={hdrOpts}>
      <Stack.Screen name="FarmerList"          component={DealerFarmersScreen} options={{ title: 'My Farmers' }} />
      <Stack.Screen name="DealerProjectDetail" component={ProjectDetailScreen} options={{ title: 'Project Detail' }} />
    </Stack.Navigator>
  );
}

export default function DealerTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: COLORS.primary, tabBarInactiveTintColor: COLORS.subtext, ...hdrOpts }}>
      <Tab.Screen name="Home"    component={DealerDashboard}     options={{ title: 'Dashboard',  tabBarIcon: ico('🏠') }} />
      <Tab.Screen name="Farmers" component={FarmersStack}        options={{ title: 'My Farmers', tabBarIcon: ico('👨‍🌾'), headerShown: false }} />
      <Tab.Screen name="Add"     component={AddFarmerScreen}     options={{ title: 'Add Farmer', tabBarIcon: ico('➕') }} />
      <Tab.Screen name="Alerts"  component={NotificationsScreen} options={{ title: 'Alerts',     tabBarIcon: ico('🔔') }} />
      <Tab.Screen name="Profile" component={ProfileScreen}       options={{ title: 'Profile',    tabBarIcon: ico('👤') }} />
    </Tab.Navigator>
  );
}
