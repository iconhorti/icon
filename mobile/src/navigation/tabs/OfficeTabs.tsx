import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { COLORS } from '../../constants/theme';
import OfficeDashboard     from '../../screens/office/OfficeDashboard';
import DocInboxScreen      from '../../screens/office/DocInboxScreen';
import ApprovalQueueScreen from '../../screens/office/ApprovalQueueScreen';
import NotificationsScreen from '../../screens/shared/NotificationsScreen';
import ProfileScreen       from '../../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const ico = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;

export default function OfficeTabs() {
  return (
    <Tab.Navigator screenOptions={{
      tabBarActiveTintColor:   COLORS.primary,
      tabBarInactiveTintColor: COLORS.subtext,
      headerStyle:             { backgroundColor: COLORS.primary },
      headerTintColor:         COLORS.white,
      headerTitleStyle:        { fontWeight: '700' },
    }}>
      <Tab.Screen name="Home"      component={OfficeDashboard}     options={{ title: 'Home',      tabBarIcon: ico('🏠') }} />
      <Tab.Screen name="Documents" component={DocInboxScreen}      options={{ title: 'Documents', tabBarIcon: ico('📄') }} />
      <Tab.Screen name="Approvals" component={ApprovalQueueScreen} options={{ title: 'Approve',   tabBarIcon: ico('✅') }} />
      <Tab.Screen name="Alerts"    component={NotificationsScreen} options={{ title: 'Alerts',    tabBarIcon: ico('🔔') }} />
      <Tab.Screen name="Profile"   component={ProfileScreen}       options={{ title: 'Profile',   tabBarIcon: ico('👤') }} />
    </Tab.Navigator>
  );
}
