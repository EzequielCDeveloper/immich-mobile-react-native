import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { useTheme } from '@/hooks/use-theme';

export type RenameAlbumModalProps = {
  visible: boolean;
  initialTitle: string;
  onClose: () => void;
  onRename: (newTitle: string) => Promise<void>;
  existingAlbumNames?: string[];
};

export function RenameAlbumModal({
  visible,
  initialTitle,
  onClose,
  onRename,
  existingAlbumNames = [],
}: RenameAlbumModalProps) {
  const theme = useTheme();
  const [title, setTitle] = useState(initialTitle);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = title.trim();
  const isDuplicate = useMemo(() => {
    if (!trimmed || trimmed.toLowerCase() === initialTitle.trim().toLowerCase()) {
      return false;
    }
    return existingAlbumNames.some(
      (name) => name.trim().toLowerCase() === trimmed.toLowerCase()
    );
  }, [existingAlbumNames, initialTitle, trimmed]);

  const handleRename = async () => {
    if (!trimmed) {
      setError('Album name cannot be empty.');
      return;
    }
    if (trimmed === initialTitle.trim()) {
      onClose();
      return;
    }
    if (isDuplicate) {
      setError(`An album named "${trimmed}" already exists.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onRename(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename album.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle(initialTitle);
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
          style={[
            styles.dialog,
            { backgroundColor: theme.surface, borderColor: theme.outlineVariant },
          ]}
          onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.dialogTitle, { color: theme.onSurface }]}>Rename Album</Text>
          <Text style={[styles.dialogSubtitle, { color: theme.onSurfaceVariant }]}>
            Enter a new name for this album.
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
              ⚠️ An album named &quot;{trimmed}&quot; already exists.
            </Text>
          ) : error ? (
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
              label={loading ? 'Saving…' : 'Rename'}
              variant="filled"
              onPress={() => void handleRename()}
              disabled={loading || !trimmed || isDuplicate}
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
    elevation: 10,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  dialogSubtitle: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: -8,
  },
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: -8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
});
