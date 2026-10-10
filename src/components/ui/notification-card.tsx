import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type NotificationType =
  | 'standard-album'
  | 'private-album'
  | 'moved-photo'
  | 'encryption-unavailable'
  | 'deleted-item'
  | 'album-renamed'
  | 'info';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
};

export type NotificationCardProps = {
  notification: NotificationItem | null;
  onDismiss: () => void;
  autoHideDuration?: number;
};

export function NotificationCard({
  notification,
  onDismiss,
  autoHideDuration = 4500,
}: NotificationCardProps) {
  const theme = useTheme();

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, autoHideDuration);
    return () => clearTimeout(timer);
  }, [autoHideDuration, notification, onDismiss]);

  if (!notification) {
    return null;
  }

  const { icon, badgeText, borderColor, bgColor } = getNotificationVisuals(
    notification.type,
    theme
  );

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View
        accessibilityRole="alert"
        accessibilityLabel={`${notification.title}: ${notification.message}`}
        style={[
          styles.container,
          {
            backgroundColor: theme.surfaceContainer,
            borderColor,
          },
        ]}>
        <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>

        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.onSurface }]}>
              {notification.title}
            </Text>
            <View style={[styles.badge, { backgroundColor: bgColor }]}>
              <Text style={[styles.badgeText, { color: borderColor }]}>
                {badgeText}
              </Text>
            </View>
          </View>
          <Text style={[styles.message, { color: theme.onSurfaceVariant }]}>
            {notification.message}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          onPress={onDismiss}
          hitSlop={8}
          style={styles.closeButton}>
          <Text style={[styles.closeText, { color: theme.onSurfaceVariant }]}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

function getNotificationVisuals(
  type: NotificationType,
  theme: {
    primary: string;
    primaryContainer: string;
    success: string;
    error: string;
    info: string;
    surfaceContainerHigh: string;
  }
) {
  switch (type) {
    case 'private-album':
      return {
        icon: '🔒',
        badgeText: 'Private Vault',
        borderColor: theme.primary,
        bgColor: theme.primaryContainer,
      };
    case 'standard-album':
      return {
        icon: '📁',
        badgeText: 'Standard Album',
        borderColor: theme.success,
        bgColor: 'rgba(16, 193, 77, 0.15)',
      };
    case 'moved-photo':
      return {
        icon: '📦',
        badgeText: 'Item Moved',
        borderColor: theme.info,
        bgColor: theme.primaryContainer,
      };
    case 'encryption-unavailable':
      return {
        icon: '⚠️',
        badgeText: 'Encryption Alert',
        borderColor: theme.error,
        bgColor: 'rgba(250, 41, 33, 0.12)',
      };
    case 'deleted-item':
      return {
        icon: '🗑️',
        badgeText: 'Item Deleted',
        borderColor: theme.error,
        bgColor: 'rgba(250, 41, 33, 0.12)',
      };
    case 'album-renamed':
      return {
        icon: '✏️',
        badgeText: 'Renamed',
        borderColor: theme.primary,
        bgColor: theme.primaryContainer,
      };
    case 'info':
    default:
      return {
        icon: 'ℹ️',
        badgeText: 'Notice',
        borderColor: theme.info,
        bgColor: theme.surfaceContainerHigh,
      };
  }
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    padding: 6,
    alignSelf: 'flex-start',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
