/**
 * Lấy hồ sơ sản phẩm từ Google Sheet qua serverless /api/product-profiles.
 * Sửa trên sheet → web tự cập nhật (edge cache ~2 phút).
 */
export interface ProductProfileData {
  fields: string[];               // tên các trường (44)
  groups: string[];               // nhóm tương ứng từng trường
  products: { values: string[] }[]; // mỗi sản phẩm = mảng giá trị theo thứ tự fields
  fetchedAt?: string;
}

export async function getProductProfiles(): Promise<ProductProfileData> {
  const r = await fetch('/api/product-profiles', { headers: { 'Cache-Control': 'no-cache' } });
  if (!r.ok) {
    const msg = await r.json().catch(() => null);
    throw new Error(msg?.error || 'Không tải được hồ sơ sản phẩm');
  }
  return r.json();
}
