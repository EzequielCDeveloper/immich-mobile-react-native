import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, Text, TextInput, View, StyleSheet, Platform } from 'react-native';

import { AssetGrid } from '@/components/media/asset-grid';
import { PermissionGate } from '@/components/permissions/permission-gate';
import { AppBar } from '@/components/ui/app-bar';
import { Screen } from '@/components/ui/screen';
import { StatusBlock } from '@/components/ui/status-block';
import { useMediaContext } from '@/context/media-context';
import { useSettings } from '@/context/settings-context';
import { useTheme } from '@/hooks/use-theme';
import { usePagedMetadata } from '@/hooks/use-paged-metadata';
import { useViewerContext } from '@/context/viewer-context';
import type { MediaTypeFilter } from '@/lib/media/contracts';

export default function SearchScreen() {
  const router = useRouter();
  const theme = useTheme();
  const media = useMediaContext();
  const viewer = useViewerContext();
  const { settings } = useSettings();
  const [query, setQuery] = useState('');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [mediaType, setMediaType] = useState<MediaTypeFilter>('all');
  const hasQuery = query.trim().length > 0;
  const hasFilters = hasQuery || favoriteOnly || mediaType !== 'all';
  const results = usePagedMetadata({
    enabled: media.permission.granted && hasFilters,
    filenameContains: query,
    favoriteOnly,
    mediaType,
    pageSize: 60,
  });

  const openAsset = (asset: Parameters<typeof viewer.open>[0][number], index: number) => {
    viewer.open(results.assets, index);
    router.push({ pathname: '/asset/[id]', params: { id: asset.id } });
  };

  return (
    <Screen>
      <AppBar title="Search" subtitle="Search local metadata" onSettings={() => router.push('/settings')} />
      <PermissionGate>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.content}>
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Filename contains…"
              placeholderTextColor={theme.onSurfaceVariant}
              accessibilityLabel="Search filenames"
              returnKeyType="search"
              style={[styles.input, { color: theme.onSurface, backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant }]}
            />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel="Show favorites only"
              accessibilityState={{ checked: favoriteOnly }}
              onPress={() => setFavoriteOnly((value) => !value)}
              style={[
                styles.favoriteFilter,
                { backgroundColor: favoriteOnly ? theme.primaryContainer : theme.surfaceContainer },
              ]}
            >
              <Text style={{ color: favoriteOnly ? theme.onPrimaryContainer : theme.onSurfaceVariant }}>Favorites</Text>
            </Pressable>
          </View>
          <View style={styles.typeFilterSection}>
            <Text style={[styles.filterLabel, { color: theme.onSurfaceVariant }]}>Media type</Text>
            <View style={styles.typeFilters}>
              {mediaTypeOptions.map((option) => {
                const selected = mediaType === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityLabel={`${option.label} media filter`}
                    accessibilityState={{ selected }}
                    onPress={() => setMediaType(option.value)}
                    style={({ pressed }) => [
                      styles.typeFilter,
                      {
                        backgroundColor: selected ? theme.primaryContainer : theme.surfaceContainer,
                        borderColor: selected ? theme.primary : theme.outlineVariant,
                      },
                      pressed ? { opacity: 0.75 } : null,
                    ]}>
                    <Text style={{ color: selected ? theme.onPrimaryContainer : theme.onSurfaceVariant, fontWeight: '700' }}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {!hasFilters ? (
            <StatusBlock kind="empty" title="Search your library" message="Enter a filename or choose a media filter." />
          ) : (
            <AssetGrid
              assets={results.assets}
              columns={settings.tilesPerRow}
              onAssetPress={openAsset}
              onEndReached={results.loadMore}
              hasMore={results.hasMore}
              refreshing={results.refreshing}
              onRefresh={results.refresh}
              loading={results.status === 'loading'}
              error={results.error}
              onRetry={results.retry}
              emptyTitle="No matching media"
              emptyMessage="Try another filename, media type, or favorites setting."
            />
          )}
        </KeyboardAvoidingView>
      </PermissionGate>
    </Screen>
  );
}

const mediaTypeOptions: { value: MediaTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
];

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  favoriteFilter: {
    minWidth: 92,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeFilterSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  filterLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  typeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeFilter: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
