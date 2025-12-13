import api from './api';

export const openMediaById = async (mediaId) => {
  if (mediaId == null || mediaId === '') {
    throw new Error('mediaId is required');
  }

  const res = await api.get(`/media/${mediaId}/download`);
  const presignedUrl = res?.data?.presignedUrl;
  if (!presignedUrl) {
    throw new Error('Could not get download URL');
  }

  window.open(presignedUrl, '_blank', 'noopener,noreferrer');
};
