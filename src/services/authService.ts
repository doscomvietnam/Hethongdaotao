/**
 * Auth Service
 * 
 * Xử lý toàn bộ logic xác thực: đăng nhập, đăng xuất,
 * quên mật khẩu, đặt lại mật khẩu, đổi mật khẩu.
 */

import { supabase } from './supabaseClient';
import type { Employee } from '../types';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

// ============================================================
// AUTH FUNCTIONS
// ============================================================

/**
 * Đăng nhập bằng email + password
 */
export async function signIn(email: string, password: string): Promise<{ user: User; session: Session }> {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
    });

    if (error) {
        // Map Supabase error thành message tiếng Việt
        if (error.message.includes('Invalid login credentials')) {
            throw new Error('Email hoặc mật khẩu không đúng');
        }
        if (error.message.includes('Email not confirmed')) {
            throw new Error('Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.');
        }
        throw new Error(error.message);
    }

    if (!data.user || !data.session) {
        throw new Error('Đăng nhập thất bại. Vui lòng thử lại.');
    }

    return { user: data.user, session: data.session };
}

/**
 * Đăng xuất
 */
export async function signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Lỗi đăng xuất:', error.message);
        throw new Error('Không thể đăng xuất. Vui lòng thử lại.');
    }
}

/**
 * Gửi email reset password
 * Không tiết lộ email có tồn tại hay không
 */
export async function resetPasswordForEmail(email: string): Promise<void> {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
    });

    // Không throw error để tránh tiết lộ email có tồn tại hay không
    if (error) {
        console.error('Reset password error:', error.message);
    }
}

/**
 * Đổi mật khẩu (dùng cho cả reset password từ email và change password khi đã đăng nhập)
 */
export async function updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });

    if (error) {
        if (error.message.includes('should be different')) {
            throw new Error('Mật khẩu mới phải khác mật khẩu hiện tại');
        }
        throw new Error('Đổi mật khẩu thất bại: ' + error.message);
    }
}

/**
 * Lấy session hiện tại
 */
export async function getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Lỗi lấy session:', error.message);
        return null;
    }
    return data.session;
}

/**
 * Lấy user hiện tại
 */
export async function getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// ============================================================
// EMPLOYEE PROFILE FUNCTIONS
// ============================================================

/**
 * Lấy thông tin nhân viên từ bảng employees theo auth_user_id
 */
export async function getEmployeeProfile(authUserId: string): Promise<Employee | null> {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // Không tìm thấy record
            return null;
        }
        console.error('Lỗi lấy employee profile:', error.message);
        return null;
    }

    return data as Employee;
}

/**
 * Xóa must_change_password = false sau khi đổi mật khẩu.
 * Dùng RPC (SECURITY DEFINER) để bypass RLS — nhân viên thường không có quyền UPDATE employees trực tiếp.
 * Admin đặt lại flag qua EmployeeManagement (dùng service role / admin client).
 */
export async function updateMustChangePassword(_authUserId: string, _value: boolean): Promise<void> {
    const { error } = await supabase.rpc('clear_own_must_change_password');
    if (error) {
        console.error('Lỗi cập nhật must_change_password:', error.message);
        throw new Error('Không thể cập nhật trạng thái mật khẩu: ' + error.message);
    }
}

// ============================================================
// AUTH STATE LISTENER
// ============================================================

/**
 * Lắng nghe thay đổi auth state (login, logout, token refresh, password recovery)
 */
export function onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
}

// ============================================================
// FULL LOGIN FLOW
// ============================================================

export interface LoginResult {
    success: true;
    user: User;
    employee: Employee;
    mustChangePassword: boolean;
}

export interface LoginError {
    success: false;
    message: string;
}

/**
 * Full login flow:
 * 1. signIn
 * 2. Lấy employee profile
 * 3. Kiểm tra employment_status
 * 4. Trả về kết quả kèm must_change_password
 */
export async function loginWithValidation(
    email: string,
    password: string
): Promise<LoginResult | LoginError> {
    try {
        // 1. Đăng nhập Supabase Auth
        const { user } = await signIn(email, password);

        // 2. Lấy employee profile
        const employee = await getEmployeeProfile(user.id);

        if (!employee) {
            // Không có hồ sơ nhân viên → đăng xuất
            await signOut();
            return {
                success: false,
                message: 'Tài khoản chưa có hồ sơ nhân viên. Vui lòng liên hệ quản trị viên.',
            };
        }

        // 3. Kiểm tra trạng thái nhân viên
        if (employee.employment_status !== 'active') {
            await signOut();
            return {
                success: false,
                message: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.',
            };
        }

        // 4. Thành công
        return {
            success: true,
            user,
            employee,
            mustChangePassword: employee.must_change_password,
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.',
        };
    }
}
