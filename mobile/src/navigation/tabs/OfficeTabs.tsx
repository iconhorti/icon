import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { Text } from 'react-native';
import { COLORS } from '../../constants/theme';
import OfficeDashboard     from '../../screens/office/OfficeDashboard';
import DocInboxScreen      from '../../screens/office/DocInboxScreen';
import KycReviewScreen     from '../../screens/office/KycReviewScreen';
import ApprovalQueueScreen from '../../screens/office/ApprovalQueueScreen';
import NotificationsScreen from '../../screens/shared/NotificationsScreen';
import ProfileScreen       from '../../screens/shared/ProfileScreen';
import ProjectDetailScreen from '../../screens/shared/ProjectDetailScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();
const ico   = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;

const tabOpts = {
  tabBarActiveTintColor:   COLORS.primary,
  tabBarInactiveTintColor: COLORS.subtext,
  headerStyle:             { backgroundColor: COLORS.primary },
  headerTintColor:         COLORS.white,
  headerTitleStyle:        { fontWeight: '700' as const },
};

// Docs stack: inbox → KYC review
function DocsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: COLORS.white, headerTitleStyle: { fontWeight: '700' as const } }}>
      <Stack.Screen name="DocInbox"      component={DocInboxScreen}      options={{ title: 'Document Inbox' }} />
      <Stack.Screen name="KycReview"     component={KycReviewScreen}     options={{ title: 'KYC Review'     }} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} options={{ title: 'Project Detail' }} />
    </Stack.Navigator>
  );
}

export default function OfficeTabs() {
  return (
    <Tab.Navigator screenOptions={tabOpts}>
      <Tab.Screen name="Home"      component={OfficeDashboard}     options={{ title: 'Home',      tabBarIcon: ico('🏠') }} />
      <Tab.Screen name="Documents" component={DocsStack}           options={{ title: 'Documents', tabBarIcon: ico('📄'), headerShown: false }} />
      <Tab.Screen name="Approvals" component={ApprovalQueueScreen} options={{ title: 'Approve',   tabBarIcon: ico('✅') }} />
      <Tab.Screen name="Alerts"    component={NotificationsScreen} options={{ title: 'Alerts',    tabBarIcon: ico('🔔') }} />
      <Tab.Screen name="Profile"   component={ProfileScreen}       options={{ title: 'Profile',   tabBarIcon: ico('👤') }} />
    </Tab.Navigator>
  );
}
