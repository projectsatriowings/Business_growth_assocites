/**
 * Resolves the authentication token stored in localStorage for BGA Enterprise
 */
export function getAuthToken(): string {
  return localStorage.getItem('bga_auth_token') || localStorage.getItem('token') || '';
}

/**
 * Builds direct URL with authentication token query parameter for seamless opening in new browser tabs
 */
export function getQuotationPdfUrl(quotationId: string, download: boolean = false): string {
  const token = getAuthToken();
  const queryParts: string[] = [];
  if (token) queryParts.push(`token=${encodeURIComponent(token)}`);
  if (download) queryParts.push('download=true');
  const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return `/api/resources/quotations/${quotationId}/pdf${qs}`;
}

/**
 * Clean helper to fetch and trigger download or view of quotation PDF using Bearer auth
 */
export async function openQuotationPdf(quotationId: string) {
  const token = getAuthToken();
  try {
    const res = await fetch(`/api/resources/quotations/${quotationId}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}: Failed to load quotation PDF`);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    window.open(blobUrl, '_blank');
  } catch {
    // Fallback directly to URL with token query param
    window.open(getQuotationPdfUrl(quotationId), '_blank');
  }
}
