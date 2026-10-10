import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { useTheme } from '@/hooks/use-theme';

export type ConfirmDeleteModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmDeleteModal({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete deletion.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          accessibilityRole="alert"
          style={[
            styles.dialog,
            { backgroundColor: theme.surface, borderColor: theme.outlineVariant },
          ]}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.iconContainer}>
            <Text style={styles.trashIcon}>🗑️</Text>
          </View>
          <Text style={[styles.dialogTitle, { color: theme.onSurface }]}>{title}</Text>
          <Text style={[styles.dialogMessage, { color: theme.onSurfaceVariant }]}>
            {message}
          </Text>

          {error ? (
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          ) : null}

          <View style={styles.actions}>
            <ActionButton
              label="Cancel"
              variant="outlined"
              onPress={handleClose}
              disabled={loading}
            />
            <ActionButton
              label={loading ? 'Deleting…' : confirmLabel}
              variant="filled"
              onPress={() => void handleConfirm()}
              disabled={loading}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(250, 41, 33, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  trashIcon: {
    fontSize: 24,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  dialogMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
});
