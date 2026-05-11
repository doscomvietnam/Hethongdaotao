/**
 * Employee Service — CRUD cho admin
 * Tạo nhân viên mới gồm 2 bước: signUp tạo auth user, rồi insert vào employees.
 * Admin session được lưu trước khi signUp và khôi phục sau để admin không bị đăng xuất.
 */
import { supabase } from './supabaseClient';
import type { Employee, EmployeeRole } from '../types';

export interface EmployeeInput {
  id?: string;
  auth_user_id?: string | null;
  email: string;
  full_name: string;
  role: EmployeeRole;
  department?: string;
  position?: string;
  phone?: string;
  avatar_url?: string;
  birth_date?: string;
  gender?: 'Nam' | 'Nữ';
  work_location?: string;
  employment_status?: 'active' | 'inactive';
  must_change_password?: boolean;
}

export async function getAllEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('full_name', { ascending: true });
  if (error) { console.error('Lỗi tải employees:', error); throw error; }
  return Array.isArray(data) ? (data as Employee[]) : [];
}

// Convert empty string / undefined to null cho các cột nullable (date, enum...)
function sanitize(input: Partial<EmployeeInput>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === '' || v === undefined) out[k] = null;
    else out[k] = v;
  }
  return out;
}

export async function createEmployee(input: EmployeeInput): Promise<void> {
  const clean = sanitize(input);
  const payload = {
    ...clean,
    email: input.email.trim().toLowerCase(),
    full_name: input.full_name.trim(),
    employment_status: input.employment_status || 'active',
    must_change_password: input.must_change_password ?? true,
  };
  const { data, error } = await supabase.from('employees').insert(payload).select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Không tạo được nhân viên — kiểm tra RLS policy INSERT cho bảng employees.');
  }
}

/**
 * Sinh mật khẩu ngẫu nhiên đủ mạnh (12 ký tự: chữ hoa + chữ thường + số + ký tự đặc biệt)
 */
export function generateRandomPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + digits + symbols;
  // Đảm bảo có đủ mỗi loại
  let pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];
  for (let i = pwd.length; i < length; i++) {
    pwd.push(all[Math.floor(Math.random() * all.length)]);
  }
  // Shuffle
  return pwd.sort(() => Math.random() - 0.5).join('');
}

export interface CreateEmployeeWithAuthResult {
  employeeId: string;
  email: string;
  password: string;
  needsEmailConfirm: boolean;
}

/**
 * Tạo nhân viên mới + tài khoản đăng nhập trong 1 lần.
 * - Lưu session admin → signUp tài khoản mới → khôi phục session admin → insert employee row.
 * - Trả về password để admin chuyển cho nhân viên.
 */
export async function createEmployeeWithAuth(
  input: EmployeeInput,
  password: string
): Promise<CreateEmployeeWithAuthResult> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error('Email bắt buộc');
  if (!password || password.length < 6) throw new Error('Mật khẩu phải tối thiểu 6 ký tự');

  // 1. Lưu session admin
  const { data: { session: adminSession } } = await supabase.auth.getSession();
  if (!adminSession) throw new Error('Phiên đăng nhập admin đã hết hạn — đăng nhập lại trước khi tạo nhân viên');

  // 2. signUp user mới
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: input.full_name.trim() },
    },
  });

  if (signUpError) {
    if (signUpError.message?.toLowerCase().includes('already registered') || signUpError.message?.toLowerCase().includes('already exists')) {
      throw new Error(`Email "${email}" đã được đăng ký. Dùng email khác.`);
    }
    throw signUpError;
  }
  if (!signUpData.user) {
    throw new Error('Không tạo được tài khoản auth — email có thể đã tồn tại');
  }

  const newUserId = signUpData.user.id;
  // Phát hiện chính xác: nếu Supabase đã set email_confirmed_at ngay → confirm email TẮT.
  // (Không thể dùng !signUpData.session vì khi admin đang đăng nhập, signUp có thể không
  //  trả session ngay cả khi confirm email tắt.)
  const emailConfirmedAt = (signUpData.user as any).email_confirmed_at
                        || (signUpData.user as any).confirmed_at;
  const needsEmailConfirm = !emailConfirmedAt;

  // 3. Khôi phục session admin (signUp có thể đã thay session nếu email confirm tắt)
  try {
    await supabase.auth.setSession({
      access_token: adminSession.access_token,
      refresh_token: adminSession.refresh_token,
    });
  } catch (e) {
    console.warn('Không khôi phục được session admin:', e);
  }

  // 4. Insert employees row với auth_user_id mới
  const clean = sanitize(input);
  const payload = {
    ...clean,
    email,
    full_name: input.full_name.trim(),
    employment_status: input.employment_status || 'active',
    must_change_password: input.must_change_password ?? true,
    auth_user_id: newUserId,
  };

  const { data: empData, error: insertError } = await supabase
    .from('employees')
    .insert(payload)
    .select()
    .single();

  if (insertError) {
    throw new Error(
      `Đã tạo tài khoản auth (${email}) nhưng không lưu được hồ sơ nhân viên: ${insertError.message}. ` +
      `Vào Supabase Dashboard → Authentication để xoá user thừa nếu muốn thử lại.`
    );
  }

  return {
    employeeId: empData?.id || '',
    email,
    password,
    needsEmailConfirm,
  };
}

export async function updateEmployee(id: string, input: Partial<EmployeeInput>): Promise<void> {
  // Loại id và email khỏi payload (email là khoá đăng nhập)
  const { id: _ignoreId, email: _ignoreEmail, ...rest } = input as any;
  const payload = sanitize(rest);

  // .select() để biết chắc có row nào bị update — nếu 0 row tức RLS chặn
  const { data, error } = await supabase
    .from('employees')
    .update(payload)
    .eq('id', id)
    .select();

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(
      'Không có bản ghi nào được cập nhật. Có thể do RLS policy chặn UPDATE — kiểm tra Supabase → Authentication → Policies cho bảng employees.'
    );
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Không xoá được bản ghi — kiểm tra RLS policy DELETE cho bảng employees.');
  }
}
