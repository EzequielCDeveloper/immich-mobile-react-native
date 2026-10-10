import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { useTheme } from '@/hooks/use-theme';

export type CreateAlbumModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreateStandard: (title: string) => Promise<void>;
  onCreatePrivate: (title: string) => Promise<void>;
  existingAlbumNames?: string[];
  canEnableEncryption?: boolean;
  encryptionUnavailableReason?: string;
  onNotifyUnavailable?: (reason: string) => void;
};

export function CreateAlbumModal({
  visible,
  onClose,
  onCreateStandard,
  onCreatePrivate,
  existingAlbumNames = [],
  canEnableEncryption = true,
  encryptionUnavailableReason,
  onNotifyUnavailable,
}: CreateAlbumModalProps) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = title.trim();
  const isDuplicate = useMemo(() => {
    if (!trimmed) return false;
    return existingAlbumNames.some(
      (name) => name.trim().toLowerCase() === trimmed.toLowerCase()
    );
  }, [existingAlbumNames, trimmed]);

  const isEncryptionBlocked = isPrivate && !canEnableEncryption;

  const handleCreate = async () => {
    if (!trimmed) {
      setError('Please enter an album name.');
      return;
    }
    if (isDuplicate) {
      setError(`An album named "${trimmed}" already exists. Album names must be unique.`);
      return;
    }
    if (isEncryptionBlocked) {
      const reason =
        encryptionUnavailableReason ||
        'Biometric authentication is not configured on this device.';
      setError(`Cannot create private album: ${reason}`);
      onNotifyUnavailable?.(reason);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (isPrivate) {
        await onCreatePrivate(trimmed);
      } else {
        await onCreateStandard(trimmed);
      }
      setTitle('');
      setIsPrivate(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create album.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setIsPrivate(false);
    setError(null);
    onClose();
  };

  const handleSelectPrivate = () => {
    setIsPrivate(true);
    if (!canEnableEncryption) {
      const reason =
        encryptionUnavailableReason ||
        'Biometric authentication is not configured on this device.';
      setError(`Cannot enable encryption: ${reason}`);
      onNotifyUnavailable?.(reason);
    } else if (error?.startsWith('Cannot enable encryption')) {
      setError(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}>
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable
          style={[styles.dialog, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}
          onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.dialogTitle, { color: theme.onSurface }]}>New Album</Text>
          <Text style={[styles.dialogSubtitle, { color: theme.onSurfaceVariant }]}>
            Organize your media into standard or biometrically encrypted private albums.
          </Text>

          <TextInput
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (error) setError(null);
            }}
            placeholder="Album name"
            placeholderTextColor={theme.onSurfaceVariant}
            style={[
              styles.input,
              {
                backgroundColor: theme.surfaceContainer,
                color: theme.onSurface,
                borderColor: isDuplicate || error ? theme.error : theme.outlineVariant,
              },
            ]}
            autoFocus
            editable={!loading}
          />

          {isDuplicate ? (
            <Text style={[styles.errorText, { color: theme.error }]}>
              ⚠️ An album named &quot;{trimmed}&quot; already exists. Album names must be unique.
            </Text>
          ) : error ? (
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          ) : null}

          <View style={styles.typeSelector}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: !isPrivate }}
              onPress={() => {
                setIsPrivate(false);
                if (error?.startsWith('Cannot enable encryption')) {
                  setError(null);
                }
              }}
              style={[
                styles.typeOption,
                {
                  backgroundColor: !isPrivate ? theme.surfaceContainerHigh : theme.surfaceContainer,
                  borderColor: !isPrivate ? theme.primary : theme.outlineVariant,
                },
              ]}>
              <Text style={styles.typeIcon}>📁</Text>
              <View style={styles.typeInfo}>
                <Text style={[styles.typeTitle, { color: theme.onSurface }]}>Standard Album</Text>
                <Text style={[styles.typeDesc, { color: theme.onSurfaceVariant }]}>
                  Visible in device gallery
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: isPrivate }}
              onPress={handleSelectPrivate}
              style={[
                styles.typeOption,
                {
                  backgroundColor: isPrivate ? theme.surfaceContainerHigh : theme.surfaceContainer,
                  borderColor: isPrivate
                    ? isEncryptionBlocked
                      ? theme.error
                      : theme.primary
                    : theme.outlineVariant,
                },
              ]}>
              <Text style={styles.typeIcon}>🔒</Text>
              <View style={styles.typeInfo}>
                <View style={styles.badgeRow}>
                  <Text style={[styles.typeTitle, { color: theme.onSurface }]}>
                    Private Vault
                  </Text>
                  {!canEnableEncryption ? (
                    <View style={[styles.unavailableBadge, { backgroundColor: 'rgba(250, 41, 33, 0.15)' }]}>
                      <Text style={[styles.unavailableBadgeText, { color: theme.error }]}>
                        Unavailable
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.typeDesc, { color: theme.onSurfaceVariant }]}>
                  Encrypted AES-256 with Fingerprint / Face ID
                </Text>
              </View>
            </Pressable>
          </View>

          {isEncryptionBlocked ? (
            <View style={[styles.warningCard, { backgroundColor: 'rgba(250, 41, 33, 0.08)', borderColor: theme.error }]}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={[styles.warningText, { color: theme.onSurface }]}>
                {encryptionUnavailableReason ||
                  'Biometric authentication (fingerprint/Face ID) is not set up on this device. Private encrypted albums cannot be created until biometrics are enabled.'}
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <ActionButton
              label="Cancel"
              variant="outlined"
              onPress={handleCancel}
              disabled={loading}
            />
            <ActionButton
              label={loading ? 'Creating…' : 'Create Album'}
              variant="filled"
              onPress={() => void handleCreate()}
              disabled={loading || !trimmed || isDuplicate || isEncryptionBlocked}
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
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  dialogSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: -8,
  },
  typeSelector: {
    gap: 10,
    marginVertical: 4,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  typeIcon: {
    fontSize: 24,
  },
  typeInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  unavailableBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unavailableBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  typeDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginTop: -4,
  },
  warningIcon: {
    fontSize: 18,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
});
