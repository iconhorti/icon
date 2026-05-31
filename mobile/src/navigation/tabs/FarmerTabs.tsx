import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { COLORS } from '../../constants/theme';
import FarmerHomeScreen       from '../../screens/farmer/FarmerHomeScreen';
import FarmerTimelineScreen   from '../../screens/farmer/FarmerTimelineScreen';
import FarmerFinancialsScreen from '../../screens/farmer/FarmerFinancialsScreen';
import NotificationsScreen    from '../../screens/shared/NotificationsScreen';
import ProfileScreen          from '../../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const ico = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;

export default function FarmerTabs() {
  return (
    <Tab.Navigator screenOptions={{
      tabBarActiveTintColor:   COLORS.primary,
      tabBarInactiveTintColor: COLORS.subtext,
      headerStyle:             { backgroundColor: COLORS.primary },
      headerTintColor:         COLORS.white,
      headerTitleStyle:        { fontWeight: '700' },
    }}>
      <Tab.Screen name="Project"    component={FarmerHomeScreen}       options={{ title: 'My Project', tabBarIcon: ico('🌱') }} />
      <Tab.Screen name="Timeline"   component={FarmerTimelineScreen}   options={{ title: 'Timeline',   tabBarIcon: ico('📅') }} />
      <Tab.Screen name="Financials" component={FarmerFinancialsScreen} options={{ title: 'Financials', tabBarIcon: ico('💰') }} />
      <Tab.Screen name="Alerts"     component={NotificationsScreen}    options={{ title: 'Alerts',     tabBarIcon: ico('🔔') }} />
      <Tab.Screen name="Profile"    component={ProfileScreen}          options={{ title: 'Profile',    tabBarIcon: ico('👤') }} />
    </Tab.Navigator>
  );
}
