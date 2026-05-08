import { apiClient, logAPI, withMock, WelloApiResponse } from '@/services/apiClient';

export type NotificationType = 'STOCK_RUPTURE' | 'EMAIL_UNVERIFIED' | 'PHONE_UNVERIFIED';
export type NotificationSeverity = 'warning' | 'info' | 'danger';

export interface UserNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  severity: NotificationSeverity;
  actionLabel?: string;
}

interface UserNotificationsPayload {
  notifications: UserNotification[];
}

const unwrapWelloData = <T>(response: WelloApiResponse<T> | T): T => {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as WelloApiResponse<T>).data;
  }
  return response as T;
};

const normalizeNotifications = (
  response: WelloApiResponse<UserNotificationsPayload> | WelloApiResponse<UserNotification[]> | UserNotificationsPayload | UserNotification[]
): UserNotification[] => {
  const data = unwrapWelloData(response as WelloApiResponse<UserNotificationsPayload> | UserNotificationsPayload);
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object' && 'notifications' in data && Array.isArray(data.notifications)) {
    return data.notifications;
  }
  return [];
};

// Mock response for GET /users/notifications
const mockNotificationsResponse: WelloApiResponse<UserNotificationsPayload> = {
  id: 'notif_mock_001',
  data: {
    notifications: [
      {
        id: 'stock_rupture',
        type: 'STOCK_RUPTURE',
        title: '49 ruptures de stock',
        description: 'Ananas, Anchois, Artichauts',
        severity: 'danger',
        actionLabel: 'Voir les stocks',
      },
      {
        id: 'email_unverified',
        type: 'EMAIL_UNVERIFIED',
        title: 'Email non verifie',
        description: 'Verifiez votre adresse email pour securiser votre compte.',
        severity: 'warning',
        actionLabel: 'Verifier',
      },
      {
        id: 'phone_unverified',
        type: 'PHONE_UNVERIFIED',
        title: 'Numero de telephone non verifie',
        description: 'Ajoutez et verifiez votre numero pour activer les alertes SMS.',
        severity: 'info',
        actionLabel: 'Ajouter',
      },
    ],
  },
};

export const notificationsService = {
  async getUserNotifications(): Promise<UserNotification[]> {
    logAPI('GET', '/users/notifications');
    return withMock(
      () => normalizeNotifications(mockNotificationsResponse),
      async () => {
        const response = await apiClient.get<
          WelloApiResponse<UserNotificationsPayload> |
          WelloApiResponse<UserNotification[]> |
          UserNotificationsPayload |
          UserNotification[]
        >('/users/notifications');
        return normalizeNotifications(response);
      }
    );
  },
};
