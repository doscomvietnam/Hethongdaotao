/**
 * Media URL Helpers
 * 
 * Các hàm chuyển đổi URL Google Drive sang dạng hiển thị trực tiếp.
 * Vẫn cần thiết vì ảnh/video có thể lưu trên Google Drive.
 * 
 * Khi chuyển hoàn toàn sang Supabase Storage,
 * các URL sẽ có dạng: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
 * và không cần chuyển đổi nữa.
 */

/**
 * Trích xuất File ID từ URL Google Drive
 */
function extractDriveFileId(url: string): string | null {
    if (!url) return null;
    const match = url.match(/\/d\/([^/]+)/);
    return match?.[1] || null;
}

/**
 * Kiểm tra xem URL có phải là Supabase Storage URL không
 */
function isSupabaseStorageUrl(url: string): boolean {
    return url.includes('.supabase.co/storage/');
}

/**
 * Helper: Chuyển URL Google Drive sang URL hiển thị ảnh trực tiếp
 * Sử dụng lh3.googleusercontent.com vì uc?export=view bị Google chặn
 * Nếu là Supabase Storage URL thì trả về nguyên gốc
 */
export function convertGoogleDriveToDirectUrl(url: string): string {
    if (!url) return "";
    if (isSupabaseStorageUrl(url)) return url;

    const fileId = extractDriveFileId(url);
    if (fileId) {
        return `https://lh3.googleusercontent.com/d/${fileId}=s1000`;
    }

    return url;
}

/**
 * Helper: Chuyển URL Google Drive sang URL embed video (dùng cho iframe)
 * Dạng: https://drive.google.com/file/d/FILE_ID/preview
 * Nếu là Supabase Storage URL thì trả về nguyên gốc
 */
export function convertGoogleDriveToVideoEmbedUrl(url: string): string {
    if (!url) return "";
    if (isSupabaseStorageUrl(url)) return url;

    const fileId = extractDriveFileId(url);
    if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    return url;
}

/**
 * Helper: Chuyển URL Google Drive sang URL embed Google Slides (dùng cho iframe)
 * Dạng: https://drive.google.com/file/d/FILE_ID/preview
 * Nếu là Supabase Storage URL thì trả về nguyên gốc
 */
export function convertGoogleDriveToSlideEmbedUrl(url: string): string {
    if (!url) return "";
    if (isSupabaseStorageUrl(url)) return url;

    const fileId = extractDriveFileId(url);
    if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    return url;
}
