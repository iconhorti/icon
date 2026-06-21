import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device        from 'expo-device';
import { type EventSubscription } from 'expo-modules-core';
import { API_URL } from '../constants/config';

// Configure how notifications are handled when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
  }),
});

/**
 * Registers the device for push notifications and stores the Expo push token
 * with the ICON backend. Must be called once after login.
 *
 * @param authToken - JWT token from AuthContext. Pass undefined when not logged in.
 */
export const usePushNotifications = (authToken: string | undefined): void => {
  const notifListenerRef    = useRef<EventSubscription | undefined>(undefined);
  const responseListenerRef = useRef<EventSubscription | undefined>(undefined);

  useEffect(() => {
    if (!authToken) return;

    let cancelled = false;

    const registerToken = async () => {
      // Skip on simulators/emulators — push tokens only work on real devices
      if (!Device.isDevice) return;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return;

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const pushToken = tokenData.data;

      if (cancelled) return;

      // Register token with ICON backend (non-critical — silently ignore errors)
      await fetch(`${API_URL}/devices/register`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ push_token: pushToken, platform: 'android' }),
      }).catch(() => {
        // Non-critical — app works without push registration
      });
    };

    registerToken();

    // Listen for notifications received while app is foregrounded
    notifListenerRef.current = Notifications.addNotificationReceivedListener((_notification) => {
      // Notification is already shown by setNotificationHandler above
      // Future: could update an unread badge count here
    });

    // Listen for user tapping a notification
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener((_response) => {
      // Future: navigate to the relevant screen based on notification data
    });

    return () => {
      cancelled = true;
      notifListenerRef.current?.remove();
      responseListenerRef.current?.remove();
    };
  }, [authToken]);
};
