import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';

import type { MediaAssetDetails } from '@/lib/media/contracts';
import { useTheme } from '@/hooks/use-theme';
import { ActionButton } from '@/components/ui/action-button';

export function DetailsSheet({
  detail,
  visible,
  onClose,
  loading = false,
  error,
  onRetry,
}: {
  detail: MediaAssetDetails | null;
  visible: boolean;
  onClose: () => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={styles.heading}>
            <Text style={[styles.title, { color: theme.onSurface }]}>Details</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close details" onPress={onClose} style={styles.close}>
              <Text style={{ color: theme.onSurface, fontSize: 22 }}>×</Text>
            </Pressable>
          </View>
          {loading ? (
            <Text style={{ color: theme.onSurfaceVariant }}>Loading details…</Text>
          ) : error ? (
            <>
              <Text style={{ color: theme.onSurfaceVariant }}>Details could not be loaded.</Text>
              <Text style={{ color: theme.onSurfaceVariant }}>{error}</Text>
              {onRetry ? <ActionButton label="Retry details" variant="tonal" onPress={onRetry} /> : null}
            </>
          ) : detail ? (
            <>
              <DetailRow label="Filename" value={detail.filename} />
              <DetailRow label="Type" value={detail.mediaType} />
              <DetailRow label="Created" value={formatDate(detail.creationTime)} />
              <DetailRow label="Dimensions" value={formatDimensions(detail.width, detail.height)} />
              <DetailRow label="Favorite" value={detail.isFavorite ? 'Yes' : 'No'} />
            </>
          ) : (
            <Text style={{ color: theme.onSurfaceVariant }}>Details are not available.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.outlineVariant }]}>
      <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.onSurface }]}>{value}</Text>
    </View>
  );
}

function formatDate(timestamp: number | null): string {
  return timestamp === null ? 'Unavailable' : new Date(timestamp).toLocaleString();
}

function formatDimensions(width: number | null, height: number | null): string {
  return width && height ? `${width} × ${height}` : 'Unavailable';
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    minHeight: 280,
    padding: 22,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 4,
  },
  heading: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  close: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    minHeight: 44,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
  },
  value: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
  },
});
