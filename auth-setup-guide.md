# Hướng dẫn Cài đặt Hệ thống Xác thực — LMS DOSCOM

## 1. Chạy SQL Migration

### Bước 1: Tạo bảng employees
1. Vào **Supabase Dashboard** → **SQL Editor** → **New Query**
2. Copy nội dung file `employees-migration.sql` và paste vào
3. Bấm **Run**

### Bước 2: Kiểm tra
```sql
SELECT * FROM employees;
-- Kết quả: bảng rỗng, sẵn sàng thêm dữ liệu
```

---

## 2. Tạo tài khoản nhân viên

### Bước 1: Tạo Auth User trong Supabase
1. Vào **Authentication** → **Users** → **Add user** → **Create New User**
2. Điền:
   - **Email**: email nhân viên (ví dụ: `nhanvien@doscom.vn`)
   - **Password**: mật khẩu tạm (ví dụ: `Doscom@123`)
   - **Auto Confirm User**: ✅ BẬT (để không cần xác nhận email)
3. Bấm **Create User**
4. **Ghi lại User UID** (dạng UUID, ví dụ: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### Bước 2: Thêm hồ sơ nhân viên vào bảng employees
1. Vào **SQL Editor** → chạy:

```sql
INSERT INTO employees (auth_user_id, email, full_name, role, department, position, employment_status, must_change_password)
VALUES (
  'USER_UID_TỪ_BƯỚC_1',  -- Thay bằng UUID thật
  'nhanvien@doscom.vn',    -- Email
  'Nguyễn Văn A',          -- Họ tên
  'employee',              -- Role: admin / manager / employee
  'Kinh doanh',            -- Phòng ban
  'Nhân viên kinh doanh',  -- Chức vụ
  'active',                -- Trạng thái
  true                     -- Bắt đổi mật khẩu lần đầu
);
```

### Hoặc dùng Table Editor
1. Vào **Table Editor** → Chọn bảng **employees** → **Insert row**
2. Điền thông tin tương tự

---

## 3. Cấu hình Reset Password URL

### Trong Supabase Dashboard:
1. Vào **Authentication** → **URL Configuration**
2. Cấu hình:
   - **Site URL**: `http://localhost:3000` (development) hoặc domain production
   - **Redirect URLs**: Thêm các URL sau:
     ```
     http://localhost:3000/reset-password
     http://localhost:3000/**
     ```
   
### Nếu có domain production:
   ```
   https://your-domain.com/reset-password
   https://your-domain.com/**
   ```

---

## 4. Cấu hình Email Template (Tùy chọn)

1. Vào **Authentication** → **Email Templates**
2. Chọn tab **Reset Password**
3. Tùy chỉnh nội dung email:

```html
<h2>Đặt lại mật khẩu - DOSCOM Academy</h2>
<p>Xin chào,</p>
<p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản DOSCOM Academy.</p>
<p>Bấm vào liên kết bên dưới để đặt mật khẩu mới:</p>
<p><a href="{{ .ConfirmationURL }}">Đặt lại mật khẩu</a></p>
<p>Liên kết này sẽ hết hạn sau 24 giờ.</p>
<p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
<br/>
<p>— DOSCOM Academy Team</p>
```

---

## 5. Quản lý nhân viên

### Vô hiệu hóa nhân viên (nghỉ việc)
```sql
UPDATE employees
SET employment_status = 'inactive'
WHERE email = 'nhanvien@doscom.vn';
```
> Nhân viên sẽ bị đăng xuất và không thể đăng nhập lại.

### Thăng chức lên Manager
```sql
UPDATE employees
SET role = 'manager'
WHERE email = 'nhanvien@doscom.vn';
```

### Hạ cấp về Employee
```sql
UPDATE employees
SET role = 'employee'
WHERE email = 'manager@doscom.vn';
```

### Reset mật khẩu cho nhân viên (qua Supabase)
1. Vào **Authentication** → **Users**
2. Tìm user → **Send password recovery email**
3. Hoặc: bấm "..." → **Reset password** → nhập mật khẩu mới

---

## 6. Phân quyền theo Role

| Tính năng | admin | manager | employee |
|-----------|-------|---------|----------|
| Dashboard (Tổng quan) | ✅ | ✅ | ❌ |
| Giới thiệu sản phẩm | ✅ | ✅ | ❌ |
| Khóa học đào tạo | ✅ | ✅ | ✅ |
| Làm bài kiểm tra | ✅ | ✅ | ✅ |
| Quản trị hệ thống | ✅ | ❌ | ❌ |
| Đổi mật khẩu | ✅ | ✅ | ✅ |

---

## 7. Biến môi trường (.env)

File `.env` đã có sẵn:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> ⚠️ Không commit file `.env` lên Git. Đảm bảo `.env` có trong `.gitignore`.

---

## 8. Chạy ứng dụng

```bash
npm run dev
```

Truy cập: `http://localhost:3000`

---

## Troubleshooting

### "Tài khoản chưa có hồ sơ nhân viên"
→ Auth user đã tạo nhưng chưa thêm row trong bảng `employees`. Chạy INSERT SQL ở bước 2.

### "Tài khoản đã bị vô hiệu hóa"  
→ `employment_status = 'inactive'`. Đổi thành `'active'` nếu muốn kích hoạt lại.

### Reset password email không nhận được
→ Kiểm tra:
- URL Configuration đã cấu hình đúng chưa
- Email có trong hộp thư spam không
- Supabase free tier giới hạn 4 email/giờ

### Lỗi RLS khi đọc employees
→ Kiểm tra xem đã chạy đúng migration SQL chưa (bao gồm cả RLS policies).
