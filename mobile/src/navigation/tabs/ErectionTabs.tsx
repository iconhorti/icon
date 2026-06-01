import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import ErectionDashboard      from '../../screens/erection/ErectionDashboard';
import SiteVisitScreen        from '../../screens/erection/SiteVisitScreen';
import MilestoneTrackerScreen from '../../screens/erection/MilestoneTrackerScreen';
import DPRScreen              from '../../screens/erection/DPRScreen';
import NotificationsScreen    from '../../screens/shared/NotificationsScreen';

const Tab = createBottomTabNavigator();
const ico = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;
const ORANGE = '#E65100';

export default function ErectionTabs() {
  return (
    <Tab.Navigator screenOptions={{
      tabBarActiveTintColor:   ORANGE,
      tabBarInactiveTintColor: '#757575',
      headerStyle:             { backgroundColor: ORANGE },
      headerTintColor:         '#fff',
      headerTitleStyle:        { fontWeight: '700' },
    }}>
      <Tab.Screen name="Home"       component={ErectionDashboard}      options={{ title: 'Sites',     tabBarIcon: ico('🏗️') }} />
      <Tab.Screen name="SiteVisit"  component={SiteVisitScreen}        options={{ title: 'New Visit', tabBarIcon: ico('📍') }} />
      <Tab.Screen name="Milestones" component={MilestoneTrackerScreen} options={{ title: 'Progress',  tabBarIcon: ico('🧱') }} />
      <Tab.Screen name="DPR"        component={DPRScreen}              options={{ title: 'DPR',       tabBarIcon: ico('📷') }} />
      <Tab.Screen name="Alerts"     component={NotificationsScreen}    options={{ title: 'Alerts',    tabBarIcon: ico('🔔') }} />
    </Tab.Navigator>
  );
}
