export type PrivateAlbum = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  isPrivate: true;
  itemCount: number;
  coverAssetId?: string;
};

export type EncryptedAsset = {
  id: string;
  albumId: string;
  filename: string;
  mediaType: 'image' | 'video';
  creationTime: number | null;
  modificationTime: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  isFavorite: boolean;
  encryptedFileName: string;
  sizeBytes?: number | null;
  originalAssetId?: string;
};

export type DecryptedSessionAsset = {
  id: string;
  albumId: string;
  filename: string;
  mediaType: 'image' | 'video';
  creationTime: number | null;
  modificationTime: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  isFavorite: boolean;
  uri: string;
  sizeBytes?: number | null;
  isAvailable: boolean;
};

export type VaultManifest = {
  version: 1;
  albums: PrivateAlbum[];
  assets: EncryptedAsset[];
};

export type BiometricCapabilities = {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: ('fingerprint' | 'facial' | 'iris')[];
};
