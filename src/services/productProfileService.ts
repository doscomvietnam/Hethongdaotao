/**
 * Hồ sơ sản phẩm — lưu trong Supabase Storage (qua serverless /api/product-profiles).
 * Không còn đồng bộ từ Google Sheet. Admin/manager có thể Thêm/Sửa.
 */
export interface ProductProfileData {
  fields: string[];
  groups: string[];
  products: { values: string[] }[];
  updatedAt?: string;
}

export async function getProductProfiles(): Promise<ProductProfileData> {
  const r = await fetch('/api/product-profiles', { cache: 'no-store' });
  if (!r.ok) {
    const msg = await r.json().catch(() => null);
    throw new Error(msg?.error || 'Không tải được hồ sơ sản phẩm');
  }
  return r.json();
}

// Lưu toàn bộ dữ liệu (fields/groups/products). Cần token admin để xác thực.
export async function saveProductProfiles(data: ProductProfileData, token: string): Promise<void> {
  const r = await fetch('/api/product-profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const msg = await r.json().catch(() => null);
    throw new Error(msg?.error || 'Lưu thất bại');
  }
}
