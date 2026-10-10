import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { AlbumCards } from '@/components/albums/album-cards';
import { CreateAlbumModal } from '@/components/albums/create-album-modal';
import { PrivateAlbumCards } from '@/components/albums/private-album-cards';
import { PermissionGate } from '@/components/permissions/permission-gate';
import { ActionButton } from '@/components/ui/action-button';
import { AppBar } from '@/components/ui/app-bar';
import { NotificationCard, type NotificationItem } from '@/components/ui/notification-card';
import { Screen } from '@/components/ui/screen';
import { StatusBlock } from '@/components/ui/status-block';
import { useMediaContext } from '@/context/media-context';
import { useVault } from '@/context/vault-context';
import { useAlbumCatalog } from '@/hooks/use-album-catalog';

export default function AlbumsScreen() {
  const router = useRouter();
  const media = useMediaContext();
  const vault = useVault();
  const catalog = useAlbumCatalog();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [notification, setNotification] = useState<NotificationItem | null>(null);

  const existingAlbumNames = useMemo(() => {
    const standardNames = catalog.cards.map((card) => card.title);
    const privateNames = vault.vaultAlbums.map((album) => album.title);
    return [...standardNames, ...privateNames];
  }, [catalog.cards, vault.vaultAlbums]);

  const handleCreateStandard = async (title: string) => {
    await media.createAlbum(title);
    media.refreshLibrary();
    setNotification({
      id: String(Date.now()),
      type: 'standard-album',
      title: 'Standard Album Created',
      message: `Device album "${title}" was successfully created in your library.`,
    });
  };

  const handleCreatePrivate = async (title: string) => {
    await vault.createPrivateAlbum(title);
    setNotification({
      id: String(Date.now()),
      type: 'private-album',
      title: 'Private Vault Created',
      message: `Private encrypted album "${title}" was created with AES-256 and biometrics.`,
    });
  };

  const handleNotifyUnavailable = (reason: string) => {
    setNotification({
      id: String(Date.now()),
      type: 'encryption-unavailable',
      title: 'Encryption Unavailable',
      message: reason,
    });
  };

  const handlePrivateAlbumPress = async (id: string) => {
    if (vault.isUnlocked(id)) {
      router.push({ pathname: '/album/private/[id]', params: { id } });
      return;
    }
    const unlocked = await vault.unlockAlbum(id);
    if (unlocked) {
      router.push({ pathname: '/album/private/[id]', params: { id } });
    }
  };

  return (
    <Screen>
      <NotificationCard
        notification={notification}
        onDismiss={() => setNotification(null)}
      />
      <AppBar
        title="Albums"
        subtitle="Device & Private Vaults"
        onSettings={() => router.push('/settings')}
        actions={[
          <ActionButton
            key="new-album"
            label="+ New Album"
            variant="tonal"
            onPress={() => setCreateModalOpen(true)}
          />,
        ]}
      />
      <PermissionGate>
        <AlbumCatalogContent
          catalog={catalog}
          onAlbumPress={(id) => router.push({ pathname: '/album/[id]', params: { id } })}
          onPrivateAlbumPress={handlePrivateAlbumPress}
        />
      </PermissionGate>
      <CreateAlbumModal
        visible={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreateStandard={handleCreateStandard}
        onCreatePrivate={handleCreatePrivate}
        existingAlbumNames={existingAlbumNames}
        canEnableEncryption={vault.canEnableEncryption}
        encryptionUnavailableReason={vault.encryptionUnavailableReason}
        onNotifyUnavailable={handleNotifyUnavailable}
      />
    </Screen>
  );
}

function AlbumCatalogContent({
  catalog,
  onAlbumPress,
  onPrivateAlbumPress,
}: {
  catalog: ReturnType<typeof useAlbumCatalog>;
  onAlbumPress: (id: string) => void;
  onPrivateAlbumPress: (id: string) => void;
}) {
  const vault = useVault();

  if (catalog.status === 'loading' && catalog.cards.length === 0 && vault.vaultAlbums.length === 0) {
    return <StatusBlock kind="loading" title="Reading albums" message="Album covers and counts are loaded locally." />;
  }
  if (catalog.status === 'error' && catalog.cards.length === 0 && vault.vaultAlbums.length === 0) {
    return (
      <StatusBlock
        kind="error"
        title="Could not read albums"
        message={catalog.error ?? undefined}
        action={<ActionButton label="Try again" variant="tonal" onPress={catalog.retry} />}
      />
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {catalog.status === 'error' ? (
        <StatusBlock
          kind="error"
          title="Could not refresh albums"
          message={catalog.error ?? undefined}
          action={<ActionButton label="Try again" variant="tonal" onPress={catalog.retry} />}
        />
      ) : null}
      <PrivateAlbumCards
        albums={vault.vaultAlbums}
        onAlbumPress={onPrivateAlbumPress}
        isUnlocked={vault.isUnlocked}
      />
      <AlbumCards cards={catalog.cards} onAlbumPress={onAlbumPress} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
  },
});

