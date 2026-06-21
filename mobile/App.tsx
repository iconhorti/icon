import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import PushNotificationRegistrar from './src/components/PushNotificationRegistrar';
import SyncQueueRunner from './src/components/SyncQueueRunner';

export default function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <PushNotificationRegistrar />
        <SyncQueueRunner />
        <NavigationContainer>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </Provider>
  );
}
