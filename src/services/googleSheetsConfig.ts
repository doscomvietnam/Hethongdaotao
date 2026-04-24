/**
 * Google Sheets Configuration
 * 
 * Cấu hình kết nối Google Sheets thông qua Google Apps Script Web App.
 * VITE_API_URL chứa URL của Google Apps Script đã deploy.
 */

export const API_URL = import.meta.env.VITE_API_URL as string;

if (!API_URL) {
    console.warn("⚠️ Thiếu VITE_API_URL trong file .env. Dữ liệu sẽ không tải được.");
}

/**
 * Helper: Gọi API Google Apps Script
 */
export async function callApi<T>(action: string, params?: Record<string, string>): Promise<T> {
    if (!API_URL) {
        throw new Error("Thiếu VITE_API_URL trong file .env");
    }

    const url = new URL(API_URL);
    url.searchParams.set("action", action);

    if (params) {
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
        throw new Error(`API lỗi: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (!result?.success) {
        throw new Error(result?.error || "API trả về lỗi không xác định");
    }

    return result.data as T;
}

/**
 * Trích xuất File ID từ URL Google Drive
 */
function extractDriveFileId(url: string): string | null {
    if (!url) return null;
    const match = url.match(/\/d\/([^/]+)/);
    return match?.[1] || null;
}

/**
 * Helper: Chuyển URL Google Drive sang URL hiển thị ảnh trực tiếp
 * Sử dụng lh3.googleusercontent.com vì uc?export=view bị Google chặn
 */
export function convertGoogleDriveToDirectUrl(url: string): string {
    if (!url) return "";

    const fileId = extractDriveFileId(url);
    if (fileId) {
        return `https://lh3.googleusercontent.com/d/${fileId}=s1000`;
    }

    return url;
}

/**
 * Helper: Chuyển URL Google Drive sang URL embed video (dùng cho iframe)
 * Dạng: https://drive.google.com/file/d/FILE_ID/preview
 */
export function convertGoogleDriveToVideoEmbedUrl(url: string): string {
    if (!url) return "";

    const fileId = extractDriveFileId(url);
    if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    return url;
}

/**
 * Helper: Chuyển URL Google Drive sang URL embed Google Slides (dùng cho iframe)
 * Dạng: https://drive.google.com/file/d/FILE_ID/preview
 */
export function convertGoogleDriveToSlideEmbedUrl(url: string): string {
    if (!url) return "";

    const fileId = extractDriveFileId(url);
    if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    return url;
}
