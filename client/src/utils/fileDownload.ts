/**
 * File Download & Link Detection Utility
 * Handles discriminating between web links and downloadable files/docs,
 * and handles programmatic local file downloading.
 */

export const isExternalWebLink = (url?: string): boolean => {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return false;
  }
  // Strip query params and hash to check file extension
  const cleanUrl = trimmed.split('?')[0].split('#')[0];
  const hasFileExt = /\.(pdf|zip|rar|7z|tar|gz|doc|docx|ppt|pptx|xls|xlsx|txt|csv|png|jpg|jpeg|gif|webp|svg|mp4|mov|webm|mp3|wav|json|xml|apk|ipa)$/i.test(cleanUrl);
  if (hasFileExt) {
    return false;
  }
  return /^https?:\/\//i.test(trimmed);
};

export const extractUrls = (text?: string): string[] => {
  if (!text) return [];
  const matches = text.match(/(https?:\/\/[^\s]+|\/uploads\/[^\s]+)/gi);
  return matches ? Array.from(new Set(matches.map(m => m.replace(/[.,;:)]+$/, '')))) : [];
};

export const downloadFile = async (url: string, defaultFilename?: string) => {
  if (!url) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch failed');
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const urlFilename = url.split('/').pop()?.split('?')[0];
    const finalFilename = defaultFilename
      ? (defaultFilename.includes('.') ? defaultFilename : `${defaultFilename}.${urlFilename?.split('.').pop() || 'bin'}`)
      : (urlFilename || 'download');

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch {
    // Fallback if fetch fails (e.g. cross-origin restriction)
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultFilename || url.split('/').pop()?.split('?')[0] || 'download';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
