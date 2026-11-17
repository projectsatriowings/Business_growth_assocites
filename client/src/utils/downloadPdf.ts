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
  return `/api/resources/quotations/${encodeURIComponent(quotationId)}/pdf${qs}`;
}

/**
 * Robust helper to download a quotation PDF via authenticated fetch and blob.
 * Avoids browser navigation/500 proxy crashes by handling response statuses gracefully.
 */
export async function downloadQuotationPdf(quotationId: string, quotationNumber?: string): Promise<void> {
  const token = getAuthToken();
  try {
    const res = await fetch(`/api/resources/quotations/${encodeURIComponent(quotationId)}/pdf?download=true`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      let errMsg = `Failed to download PDF (HTTP ${res.status})`;
      try {
        const data = await res.json();
        if (data.error) errMsg = data.error;
      } catch {}
      throw new Error(errMsg);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanNumber = quotationNumber ? quotationNumber.replace(/[^a-zA-Z0-9_-]/g, '_') : quotationId;
    a.download = `Quotation-${cleanNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    console.warn('[downloadQuotationPdf] Blob download fallback to direct URL:', err);
    // If browser blocks fetch or network drops, direct link fallback
    window.open(getQuotationPdfUrl(quotationId, true), '_blank');
  }
}

/**
 * Clean helper to fetch and trigger view of quotation PDF using Bearer auth in a new tab
 */
export async function openQuotationPdf(quotationId: string) {
  const token = getAuthToken();
  try {
    const res = await fetch(`/api/resources/quotations/${encodeURIComponent(quotationId)}/pdf`, {
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
