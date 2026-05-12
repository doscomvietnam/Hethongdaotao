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
  const { error } = await supabase.from('employees').insert(payload);
  if (error) throw error;
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

/** Helper: khôi phục session admin sau khi signUp/signIn thay đổi session */
async function restoreAdminSession(session: { access_token: string; refresh_token: string }) {
  try {
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  } catch (e) {
    console.warn('Không khôi phục được session admin:', e);
  }
}

/**
 * Khi email đã tồn tại trong auth nhưng KHÔNG có trong employees (orphan từ lần tạo trước bị lỗi),
 * thử đăng nhập bằng email + password để lấy lại auth user ID.
 */
async function tryRecoverOrphanedAuthUser(
  email: string,
  password: string,
): Promise<{ userId: string; needsEmailConfirm: boolean } | null> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return null;
    const confirmed = (data.user as any).email_confirmed_at || (data.user as any).confirmed_at;
    return { userId: data.user.id, needsEmailConfirm: !confirmed };
  } catch {
    return null;
  }
}

/**
 * Tạo nhân viên mới + tài khoản đăng nhập trong 1 lần.
 * - Kiểm tra trùng email trong employees trước.
 * - Nếu email đã có trong auth (orphan từ lần trước) → thử khôi phục thay vì báo lỗi.
 * - Lưu session admin → signUp/recover → khôi phục session admin → insert employee row.
 */
export async function createEmployeeWithAuth(
  input: EmployeeInput,
  password: string
): Promise<CreateEmployeeWithAuthResult> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error('Email bắt buộc');
  if (!password || password.length < 6) throw new Error('Mật khẩu phải tối thiểu 6 ký tự');

  // ── Bước 0: Kiểm tra email đã có trong bảng employees chưa ──
  const { data: existingEmp } = await supabase
    .from('employees')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existingEmp) {
    throw new Error(`Email "${email}" đã có trong danh sách nhân viên. Dùng email khác.`);
  }

  // ── Bước 1: Lưu session admin ──
  const { data: { session: adminSession } } = await supabase.auth.getSession();
  if (!adminSession) throw new Error('Phiên đăng nhập admin đã hết hạn — đăng nhập lại trước khi tạo nhân viên');

  let newUserId: string;
  let needsEmailConfirm: boolean;

  // ── Bước 2: signUp user mới ──
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: input.full_name.trim() } },
  });

  const isAlreadyRegistered =
    signUpError?.message?.toLowerCase().includes('already registered') ||
    signUpError?.message?.toLowerCase().includes('already exists');

  // "Fake signUp": Supabase trả user nhưng identities rỗng khi email đã tồn tại (confirm email BẬT)
  const identities = (signUpData?.user as any)?.identities;
  const isFakeSignUp =
    !signUpError && signUpData?.user &&
    Array.isArray(identities) && identities.length === 0;

  if (signUpError && !isAlreadyRegistered) {
    throw signUpError;
  }

  if (isAlreadyRegistered || isFakeSignUp) {
    // Email có trong auth nhưng KHÔNG có trong employees → orphan từ lần tạo trước bị lỗi.
    // Thử đăng nhập để lấy lại auth user ID.
    const recovered = await tryRecoverOrphanedAuthUser(email, password);
    await restoreAdminSession(adminSession);

    if (recovered) {
      newUserId = recovered.userId;
      needsEmailConfirm = recovered.needsEmailConfirm;
    } else {
      throw new Error(
        `Email "${email}" đã có tài khoản đăng nhập (có thể từ lần tạo trước bị lỗi) nhưng mật khẩu không khớp. ` +
        `Vào Supabase Dashboard → Authentication → Users, tìm và xoá user "${email}" rồi thử lại.`
      );
    }
  } else if (!signUpData?.user) {
    throw new Error('Không tạo được tài khoản auth — email có thể đã tồn tại');
  } else {
    // signUp thành công bình thường
    newUserId = signUpData.user.id;
    const confirmed = (signUpData.user as any).email_confirmed_at
                   || (signUpData.user as any).confirmed_at;
    needsEmailConfirm = !confirmed;
  }

  // ── Bước 3: Khôi phục session admin ──
  await restoreAdminSession(adminSession);

  // ── Bước 4: Insert employees row với auth_user_id ──
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
