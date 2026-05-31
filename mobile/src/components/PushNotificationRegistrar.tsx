import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuthContext }        from '../context/AuthContext';

/**
 * Invisible component — renders null, just registers push notifications.
 * Must be rendered inside AuthProvider so it can access the auth context.
 */
export default function PushNotificationRegistrar() {
  const { user } = useAuthContext();
  usePushNotifications(user?.token);
  return null;
}
