/**
 * Storage Service — upload ảnh lên Supabase Storage
 *
 * Dùng bucket `lms-assets` (public). Folder con phân loại:
 *   - avatars/         (ảnh đại diện nhân viên)
 *   - course-thumbnails/   (thumbnail khoá học)
 *   - product-thumbnails/  (thumbnail sản phẩm)
 *
 * Setup bucket + RLS: chạy file storage-setup.sql trong Supabase SQL Editor.
 */
import { supabase } from './supabaseClient';

const BUCKET = 'lms-assets';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

export type UploadFolder = 'avatars' | 'course-thumbnails' | 'product-thumbnails';

function sanitizeFilename(name: string): string {
  // Bỏ dấu, ký tự đặc biệt; giữ lại chữ/số/dấu chấm/gạch
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-80); // giới hạn độ dài
}

export interface UploadResult {
  url: string;
  path: string;
}

export async function uploadImage(file: File, folder: UploadFolder): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Định dạng không hỗ trợ. Chấp nhận: JPG, PNG, WEBP, GIF, SVG.');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`Ảnh quá lớn (${(file.size / 1024 / 1024).toFixed(1)} MB). Tối đa 5 MB.`);
  }

  const ts = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const safe = sanitizeFilename(file.name) || 'image';
  const path = `${folder}/${ts}-${random}-${safe}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
      contentType: file.type,
    });

  if (uploadErr) {
    if (uploadErr.message?.toLowerCase().includes('not found')) {
      throw new Error(`Bucket "${BUCKET}" chưa tồn tại. Hãy chạy file storage-setup.sql trong Supabase SQL Editor.`);
    }
    if (uploadErr.message?.toLowerCase().includes('row-level security') || uploadErr.message?.toLowerCase().includes('unauthorized')) {
      throw new Error('Không có quyền upload. Hãy chạy file storage-setup.sql để mở RLS policy cho Storage.');
    }
    throw uploadErr;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function deleteImage(pathOrUrl: string): Promise<void> {
  // Nếu nhận url đầy đủ → trích path sau /<bucket>/
  let path = pathOrUrl;
  const marker = `/${BUCKET}/`;
  const idx = pathOrUrl.indexOf(marker);
  if (idx >= 0) path = pathOrUrl.slice(idx + marker.length);

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
