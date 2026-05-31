import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthContext } from '../context/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import TabNavigator from './TabNavigator';
import LoadingScreen from '../components/shared/LoadingScreen';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const { user, loading } = useAuthContext();

  if (loading) return <LoadingScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user
        ? <Stack.Screen name="Main"  component={TabNavigator} />
        : <Stack.Screen name="Login" component={LoginScreen} />
      }
    </Stack.Navigator>
  );
}
