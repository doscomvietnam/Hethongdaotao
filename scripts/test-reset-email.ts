import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function main() {
    const email = 'ngovanphat2612@gmail.com';
    console.log(`📧 Gửi reset password tới: ${email}`);
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:3000/reset-password',
    });

    if (error) {
        console.error('❌ Lỗi:', error.message, '| Status:', error.status);
    } else {
        console.log('✅ Thành công! Kiểm tra hộp thư:', email);
    }
}

main().catch(console.error);
