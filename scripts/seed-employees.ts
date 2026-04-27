/**
 * Script tạo tài khoản nhân viên hàng loạt trong Supabase
 * 
 * Cách chạy:
 * 1. Lấy Service Role Key từ Supabase Dashboard → Settings → API → service_role
 * 2. Thêm vào file .env: SUPABASE_SERVICE_ROLE_KEY=...
 * 3. Chạy: npx tsx scripts/seed-employees.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Thiếu VITE_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env');
    process.exit(1);
}

// Admin client (dùng service_role key để tạo user)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// Mật khẩu mặc định — nhân viên sẽ phải đổi khi đăng nhập lần đầu
const DEFAULT_PASSWORD = 'Doscom@2026';

interface EmployeeData {
    employee_code: string;
    full_name: string;
    department: string;
    position: string;
    email: string;
    role: 'admin' | 'manager' | 'employee';
    work_location: string;
}

const employees: EmployeeData[] = [
    { employee_code: 'DC0001', full_name: 'Vũ Mạnh Thắng', department: 'Chủ tịch', position: 'Chủ tịch Công ty', email: 'manhthangvu888@gmail.com', role: 'manager', work_location: 'Hà Nội' },
    { employee_code: 'DC0035', full_name: 'Vũ Khánh Huyền', department: 'Tổng hợp', position: 'Trợ lý Chủ tịch', email: 'vkh280@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0002', full_name: 'Nguyễn Thị Linh Trang', department: 'Tổng hợp', position: 'Nhân viên kế toán', email: 'tranglinhthinguyen@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0003', full_name: 'Nguyễn Tuấn Anh', department: 'Kinh doanh', position: 'Phó Giám đốc vận hành', email: 'anhnguyen.vpc@gmail.com', role: 'manager', work_location: 'Hà Nội' },
    { employee_code: 'DC0004', full_name: 'Kiều Trúc Tùng', department: 'Kinh doanh', position: 'Leader Kinh doanh', email: 'kieutung405@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0005', full_name: 'Lê Thị Thúy Anh', department: 'Kinh doanh', position: 'Nhân viên Kinh doanh', email: 'lethithuyeanh1712@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0006', full_name: 'Hoàng Xuân Duy', department: 'Marketing', position: 'Leader ADS', email: 'hxduy93@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0007', full_name: 'Phan Minh Thắng', department: 'Marketing', position: 'Nhân viên vận hành sàn TMĐT', email: 'minhthang0919@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0009', full_name: 'Hoàng Thị Yến', department: 'Marketing', position: 'Leader Content', email: 'hoangyen.mywork@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0011', full_name: 'An Bảo Long', department: 'Marketing', position: 'Leader Media', email: 'ann.long9.9802@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0012', full_name: 'Bùi Văn Thức', department: 'Kinh doanh', position: 'Nhân viên Kỹ thuật', email: 'buivanthuc35k1@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0013', full_name: 'Nguyễn Quốc Huy', department: 'Kinh doanh', position: 'Quản lý cửa hàng chi nhánh HCM', email: 'nghuygtn@gmail.com', role: 'employee', work_location: 'Hồ Chí Minh' },
    { employee_code: 'DC0019', full_name: 'Triệu Ngọc Anh', department: 'Marketing', position: 'Nhân viên content', email: 'anhtn2001.work@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0022', full_name: 'Mai Đức Hiệp', department: 'Marketing', position: 'Nhân viên vận hành sàn TMĐT', email: 'duchiepmài.ecom@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0023', full_name: 'Nguyễn Trọng Bảo', department: 'Marketing', position: 'Nhân viên thiết kế', email: 'trongbao142@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0024', full_name: 'Tống Thị Huyền', department: 'Kinh doanh', position: 'Nhân viên Kinh doanh', email: 'doscomhuyen@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0027', full_name: 'Nguyễn Thị Thúy Linh', department: 'Tổng hợp', position: 'Phó leader HCNS', email: 'thuylinhnguyen13017@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0028', full_name: 'Cao Thị Vân', department: 'Marketing', position: 'Nhân viên vận hành sàn TMĐT', email: 'vanpink.tmr@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0036', full_name: 'Trần Văn Tình', department: 'Marketing', position: 'Leader sàn TMĐT', email: 'fbtrantinh5@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0037', full_name: 'Phạm Quang Duy', department: 'Kho', position: 'Nhân viên kho', email: 'quangduyy2003@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0038', full_name: 'Nguyễn Thanh Trúc', department: 'Kinh doanh', position: 'Nhân viên chăm sóc khách hàng', email: 'thanhtrucnt1201@gmail.com', role: 'employee', work_location: 'Hồ Chí Minh' },
    { employee_code: 'DC0041', full_name: 'Bùi Trung Sơn', department: 'Kinh doanh', position: 'Nhân viên kỹ thuật', email: 'buisonxb@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0043', full_name: 'Hoàng Phương Nam', department: 'Marketing', position: 'Nhân viên Google Ads', email: 'hoangnam25993@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0052', full_name: 'Trần Thị Thu', department: 'Marketing', position: 'Nhân viên vận hành sàn TMĐT', email: 'tranmaitthunb2001@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0056', full_name: 'Lê Quỳnh Anh', department: 'Marketing', position: 'Nhân viên vận hành sàn TMĐT', email: 'lqa0509@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0060', full_name: 'Đào Thị Hương', department: 'Marketing', position: 'Nhân viên thiết kế', email: 'daohuongmf1992003@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0062', full_name: 'Bùi Anh Tú', department: 'Kinh doanh', position: 'Nhân viên chăm sóc khách hàng', email: 'anhhtuss2309@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0068', full_name: 'Trần Thùy Dương', department: 'Kinh doanh', position: 'Nhân viên chăm sóc khách hàng', email: 'tranmanhthuyduong1402@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0071', full_name: 'Lê Duy Tú', department: 'Kho', position: 'Nhân viên kho', email: 'leduytutime@gmail.com', role: 'employee', work_location: 'Hồ Chí Minh' },
    { employee_code: 'DC0072', full_name: 'Dương Bảo Minh', department: 'Kinh doanh', position: 'Nhân viên kỹ thuật', email: 'miinm1995@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0076', full_name: 'Nguyễn Quang Minh', department: 'Kinh doanh', position: 'Nhân viên Kinh doanh', email: 'minhminh12092k3@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0081', full_name: 'Nguyễn Thị Kim Ngân', department: 'Marketing', position: 'Nhân viên Booking', email: 'nguyenthikimngan10052004@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0082', full_name: 'Đoàn Thị Hồng Ngọc', department: 'Tổng hợp', position: 'Nhân viên kế toán', email: 'doanngoc2702@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0087', full_name: 'Ngô Văn Phát', department: 'Công nghệ', position: 'Trợ lý vận hành', email: 'ngovanphat2612@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0088', full_name: 'Nguyễn Hương Lan', department: 'Công nghệ', position: 'Trợ lý vận hành', email: 'nguyenlan2000ts@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0089', full_name: 'Đỗ Minh Lương', department: 'Marketing', position: 'Nhân viên content', email: 'minhhuong.content@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0092', full_name: 'Vũ Thị Quỳnh Trang', department: 'Công nghệ', position: 'Trợ lý vận hành', email: 'vuquynhtrang1924@gmail.com', role: 'admin', work_location: 'Hà Nội' },
    { employee_code: 'DC0093', full_name: 'Trần Phương Nam', department: 'Marketing', position: 'Nhân viên ADS', email: 'tranphuongnam.2010tb@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0094', full_name: 'Hoàng Tuấn', department: 'Tổng hợp', position: 'Nhân viên tuyển dụng', email: 'tuanhoang10900@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0095', full_name: 'Nguyễn Bích Ngọc', department: 'Công nghệ', position: 'Trợ lý Chủ tịch', email: 'ngochsnoitru@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0096', full_name: 'Đoàn Anh Phương', department: 'Kinh doanh', position: 'Nhân viên chăm sóc khách hàng', email: 'phuongdoanova@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0097', full_name: 'Cao Hoàng Uyên', department: 'Marketing', position: 'Nhân viên Booking', email: 'caohoangmacuyen@gmail.com', role: 'employee', work_location: 'Hà Nội' },
    { employee_code: 'DC0098', full_name: 'Bùi Thị Anh Thương', department: 'Marketing', position: 'Nhân viên content', email: 'btathuong075@gmail.com', role: 'employee', work_location: 'Hà Nội' },
];

async function main() {
    console.log('========================================');
    console.log('🚀 BẮT ĐẦU TẠO TÀI KHOẢN NHÂN VIÊN');
    console.log(`📋 Tổng số: ${employees.length} nhân viên`);
    console.log(`🔑 Mật khẩu mặc định: ${DEFAULT_PASSWORD}`);
    console.log('========================================\n');

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const emp of employees) {
        try {
            // 1. Tạo Auth User
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: emp.email,
                password: DEFAULT_PASSWORD,
                email_confirm: true, // Tự động xác nhận email
            });

            if (authError) {
                throw new Error(`Auth: ${authError.message}`);
            }

            if (!authData.user) {
                throw new Error('Không tạo được auth user');
            }

            // 2. Thêm vào bảng employees
            const { error: insertError } = await supabase.from('employees').insert({
                auth_user_id: authData.user.id,
                email: emp.email,
                full_name: emp.full_name,
                role: emp.role,
                department: emp.department,
                position: emp.position,
                employment_status: 'active',
                must_change_password: true,
            });

            if (insertError) {
                // Rollback: xóa auth user nếu insert employee thất bại
                await supabase.auth.admin.deleteUser(authData.user.id);
                throw new Error(`DB: ${insertError.message}`);
            }

            success++;
            const roleIcon = emp.role === 'admin' ? '👑' : emp.role === 'manager' ? '⭐' : '👤';
            console.log(`✅ ${emp.employee_code} | ${roleIcon} ${emp.full_name} | ${emp.email}`);

        } catch (error: any) {
            failed++;
            const msg = `❌ ${emp.employee_code} | ${emp.full_name} | ${error.message}`;
            console.log(msg);
            errors.push(msg);
        }

        // Delay nhỏ để tránh rate limit
        await new Promise(r => setTimeout(r, 200));
    }

    console.log('\n========================================');
    console.log(`✅ Thành công: ${success}/${employees.length}`);
    console.log(`❌ Thất bại: ${failed}/${employees.length}`);
    console.log('========================================');

    if (errors.length > 0) {
        console.log('\n⚠️ Chi tiết lỗi:');
        errors.forEach(e => console.log(e));
    }

    console.log(`\n📌 Mật khẩu mặc định cho tất cả: ${DEFAULT_PASSWORD}`);
    console.log('📌 Nhân viên sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu.');
}

main().catch(console.error);
