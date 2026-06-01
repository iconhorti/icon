import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import AgronomistDashboard    from '../../screens/agronomist/AgronomistDashboard';
import FarmListScreen         from '../../screens/agronomist/FarmListScreen';
import IotMonitorScreen       from '../../screens/agronomist/IotMonitorScreen';
import HealthAssessmentScreen from '../../screens/agronomist/HealthAssessmentScreen';
import NotificationsScreen    from '../../screens/shared/NotificationsScreen';

const Tab = createBottomTabNavigator();
const ico = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;
const PURPLE = '#6A1B9A';

export default function AgronomistTabs() {
  return (
    <Tab.Navigator screenOptions={{
      tabBarActiveTintColor:   PURPLE,
      tabBarInactiveTintColor: '#757575',
      headerStyle:             { backgroundColor: PURPLE },
      headerTintColor:         '#fff',
      headerTitleStyle:        { fontWeight: '700' },
    }}>
      <Tab.Screen name="Home"       component={AgronomistDashboard}    options={{ title: 'Dashboard',  tabBarIcon: ico('🌱') }} />
      <Tab.Screen name="Farms"      component={FarmListScreen}         options={{ title: 'My Farms',   tabBarIcon: ico('🌾') }} />
      <Tab.Screen name="IoT"        component={IotMonitorScreen}       options={{ title: 'IoT Live',   tabBarIcon: ico('🌡️') }} />
      <Tab.Screen name="Assessment" component={HealthAssessmentScreen} options={{ title: 'Assessment', tabBarIcon: ico('📊') }} />
      <Tab.Screen name="Alerts"     component={NotificationsScreen}    options={{ title: 'Alerts',     tabBarIcon: ico('🔔') }} />
    </Tab.Navigator>
  );
}
