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
 * Dùng endpoint drive.google.com/thumbnail vì nó cập nhật nhanh hơn
 * lh3.googleusercontent.com khi user upload đè file (cùng fileId, content mới).
 * Nếu là Supabase Storage URL thì trả về nguyên gốc.
 */
export function convertGoogleDriveToDirectUrl(url: string): string {
    if (!url) return "";
    if (isSupabaseStorageUrl(url)) return url;

    const fileId = extractDriveFileId(url);
    if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }

    return url;
}

/**
 * Trích xuất Video ID từ URL YouTube (hỗ trợ youtu.be, youtube.com/watch, youtube.com/shorts, youtube.com/embed)
 */
function extractYouTubeVideoId(url: string): string | null {
    if (!url) return null;
    // youtu.be/<id>
    let m = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    // youtube.com/watch?v=<id>
    m = url.match(/youtube\.com\/watch\?[^#]*?v=([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    // youtube.com/shorts/<id>
    m = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    // youtube.com/embed/<id> — already an embed URL
    m = url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    return null;
}

/**
 * Helper: Chuyển URL Google Drive hoặc YouTube sang URL embed video (dùng cho iframe)
 * Drive: https://drive.google.com/file/d/FILE_ID/preview
 * YouTube: https://www.youtube.com/embed/VIDEO_ID
 * Nếu là Supabase Storage URL thì trả về nguyên gốc
 */
export function convertGoogleDriveToVideoEmbedUrl(url: string): string {
    if (!url) return "";
    if (isSupabaseStorageUrl(url)) return url;

    const ytId = extractYouTubeVideoId(url);
    if (ytId) {
        return `https://www.youtube.com/embed/${ytId}`;
    }

    const fileId = extractDriveFileId(url);
    if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    return url;
}

/**
 * Helper: Chuyển URL Google Drive sang URL video trực tiếp (dùng cho <video> element)
 * Dạng: https://drive.google.com/uc?export=download&id=FILE_ID
 * Cho phép detect play/pause qua native video events
 * YouTube vẫn trả về embed URL (cần iframe)
 * Nếu là Supabase Storage URL thì trả về nguyên gốc
 */
export function convertGoogleDriveToDirectVideoUrl(url: string): string {
    if (!url) return "";
    if (isSupabaseStorageUrl(url)) return url;

    // YouTube → vẫn dùng embed URL (cần iframe + postMessage API)
    const ytId = extractYouTubeVideoId(url);
    if (ytId) {
        return `https://www.youtube.com/embed/${ytId}?enablejsapi=1`;
    }

    // Google Drive → chuyển sang URL trực tiếp để dùng <video> element
    const fileId = extractDriveFileId(url);
    if (fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
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

