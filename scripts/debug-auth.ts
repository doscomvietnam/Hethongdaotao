import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
    // 1. Kiểm tra dữ liệu trong bảng employees
    const { data: employees, error } = await supabase.from('employees').select('auth_user_id, email, role').limit(5);
    console.log('📋 Dữ liệu employees (5 đầu):', error ? `LỖI: ${error.message}` : JSON.stringify(employees, null, 2));

    // 2. Thử đăng nhập bằng anon key client (giống app)
    const anonClient = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_ANON_KEY!
    );

    const { data: loginData, error: loginError } = await anonClient.auth.signInWithPassword({
        email: 'vuquynhtrang1924@gmail.com',
        password: 'Doscom@2026',
    });

    if (loginError) {
        console.log('❌ Login thất bại:', loginError.message);
        return;
    }
    console.log('\n✅ Login OK, user ID:', loginData.user.id);

    // 3. Query employees với anon client (có RLS)
    const { data: profile, error: profileError } = await anonClient
        .from('employees')
        .select('*')
        .eq('auth_user_id', loginData.user.id)
        .single();

    console.log('\n📋 Profile query result:', profileError ? `LỖI: ${profileError.message} (code: ${profileError.code})` : JSON.stringify(profile, null, 2));

    await anonClient.auth.signOut();
}

main().catch(console.error);
