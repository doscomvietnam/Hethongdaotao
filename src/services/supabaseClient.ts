/**
 * Supabase Client Configuration
 * 
 * Khởi tạo Supabase client để kết nối đến PostgreSQL database.
 * Sử dụng VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY từ file .env
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("⚠️ Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong file .env. Dữ liệu sẽ không tải được.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
    },
});
