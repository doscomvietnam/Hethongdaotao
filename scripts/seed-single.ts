import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
    const { data, error: authError } = await supabase.auth.admin.createUser({
        email: 'duchiepmai.ecom@gmail.com',
        password: 'Doscom@2026',
        email_confirm: true,
    });

    if (authError) { console.error('❌ Auth:', authError.message); return; }

    const { error: dbError } = await supabase.from('employees').insert({
        auth_user_id: data.user.id,
        email: 'duchiepmai.ecom@gmail.com',
        full_name: 'Mai Đức Hiệp',
        role: 'employee',
        department: 'Marketing',
        position: 'Nhân viên vận hành sàn TMĐT',
        employment_status: 'active',
        must_change_password: true,
    });

    if (dbError) {
        await supabase.auth.admin.deleteUser(data.user.id);
        console.error('❌ DB:', dbError.message);
        return;
    }

    console.log('✅ DC0022 | 👤 Mai Đức Hiệp | duchiepmai.ecom@gmail.com');
}

main().catch(console.error);
