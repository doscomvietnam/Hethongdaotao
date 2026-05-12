# HƯỚNG DẪN SỬ DỤNG — MANAGER / ADMIN

Tài liệu dành cho **trưởng phòng (Manager)** và **quản trị viên (Admin)** của hệ thống đào tạo Doscom.

> Nếu bạn là nhân viên thường, đọc [HUONG_DAN_NHAN_VIEN.md](HUONG_DAN_NHAN_VIEN.md) thay vì tài liệu này.

---

## MỤC LỤC

1. [Phân quyền tổng quan](#1-phân-quyền-tổng-quan)
2. [Truy cập trang Quản trị](#2-truy-cập-trang-quản-trị)
3. [Quản lý nhân viên](#3-quản-lý-nhân-viên)
4. [Quản lý sản phẩm](#4-quản-lý-sản-phẩm)
5. [Quản lý khóa học](#5-quản-lý-khóa-học)
6. [Quản lý bộ câu hỏi (Quiz)](#6-quản-lý-bộ-câu-hỏi-quiz)
7. [Dashboard tổng quan](#7-dashboard-tổng-quan)
8. [Đồng bộ Lark Base](#8-đồng-bộ-lark-base)
9. [Xuất báo cáo Excel](#9-xuất-báo-cáo-excel)
10. [System Settings](#10-system-settings)

---

## 1. PHÂN QUYỀN TỔNG QUAN

| Quyền | Admin | Manager | Employee |
|---|:---:|:---:|:---:|
| Đăng nhập + xem khóa học | ✅ | ✅ | ✅ |
| Làm quiz | ✅ | ✅ | ✅ |
| Vào trang Quản trị | ✅ | ✅ | ❌ |
| Tạo / sửa khóa học phòng ban mình | ✅ | ✅ | ❌ |
| Tạo / sửa khóa học mọi phòng | ✅ | ❌ | ❌ |
| Tạo / sửa / xóa nhân viên | ✅ | ❌ | ❌ |
| Tạo / sửa sản phẩm | ✅ | ❌ | ❌ |
| Đồng bộ Lark Base | ✅ | ✅ (phòng mình) | ❌ |
| Xuất Excel | ✅ | ✅ (phòng mình) | ❌ |
| System Settings | ✅ | ❌ | ❌ |

---

## 2. TRUY CẬP TRANG QUẢN TRỊ

Sidebar → **Quản trị hệ thống**. Sẽ thấy các tab:
- **Nhân viên** (admin only)
- **Sản phẩm** (admin only)
- **Khóa học**
- **Quiz**
- **Cài đặt hệ thống** (admin only)

> Manager chỉ thấy 2 tab: **Khóa học** + **Quiz** trong phạm vi phòng ban mình.

---

## 3. QUẢN LÝ NHÂN VIÊN (ADMIN)

### 3.1. Thêm nhân viên mới

1. Tab **Nhân viên** → bấm **+ Thêm nhân viên**
2. Điền form:
   - **Email** (bắt buộc, duy nhất, là khóa đăng nhập)
   - **Mật khẩu khởi tạo**: mặc định `Doscom@2026`, có thể bấm 🔄 để sinh mật khẩu ngẫu nhiên
   - **Họ tên**
   - **Vai trò**: Admin / Manager / Employee
   - **Phòng ban**: chọn từ danh sách hoặc gõ tự do
   - **Vị trí**, **SĐT**, **Ngày sinh**, **Giới tính**, **Nơi làm việc**
3. Bấm **Tạo mới**
4. **Modal hiện credentials** — copy email + mật khẩu để gửi nhân viên qua Lark / email

### 3.2. Sửa thông tin nhân viên

Click hàng → modal **Sửa nhân viên**. Có thể đổi: họ tên, vai trò, phòng ban, vị trí, SĐT, trạng thái.

**Email không sửa được** (vì là khóa auth).

### 3.3. Xóa nhân viên

Click 🗑️ → confirm. Lưu ý: chỉ xóa row `employees`, **auth user vẫn còn** trong Supabase Auth → vào Supabase Dashboard → Authentication để xóa thủ công nếu muốn xóa hoàn toàn.

### 3.4. Lọc & tìm kiếm

- Ô search: gõ tên / email
- Dropdown role: lọc theo Admin / Manager / Employee

---

## 4. QUẢN LÝ SẢN PHẨM (ADMIN)

Tab **Sản phẩm** → CRUD sản phẩm Doscom / Noma.

### 4.1. Tạo sản phẩm

1. Bấm **+ Thêm sản phẩm**
2. Điền:
   - **Mã sản phẩm** (SKU, ví dụ: `P_CAM_DA1`)
   - **Tên sản phẩm**
   - **Thương hiệu**: Doscom / Noma
   - **Danh mục** (gõ tự do, ví dụ: "Camera", "Ghi âm", "Định vị")
   - **Mô tả ngắn**
   - **4 tính năng nổi bật** (mỗi tính năng 1 dòng)
   - **Thumbnail**: upload file hoặc dán URL Drive
3. **Tạo mới**

> **Lưu ý**: `category` của sản phẩm sẽ thành chip filter cấp 2 trên trang Khóa học & Kiểm tra. Đặt tên ngắn gọn, nhất quán.

### 4.2. Liên kết sản phẩm với khóa học

Sản phẩm liên kết với khóa học qua **`product_id`** ở bảng courses. Khi tạo khóa học, chọn sản phẩm liên kết → vòng quay sẽ tự gom sản phẩm này.

---

## 5. QUẢN LÝ KHÓA HỌC

### 5.1. Tạo khóa học mới

1. Tab **Khóa học** → bấm **+ Thêm khóa học**
2. Điền form:
   - **Mã khóa học** (auto-generated `C_<timestamp>`, có thể chỉnh)
   - **Tên khóa học**
   - **Nhóm đào tạo**: Doscom / Noma / Nội bộ / Claude
   - **Danh mục** (gõ tự do, vd: "Quy trình", "Sản phẩm", "Tài liệu đào tạo")
   - **Phòng ban được giao**:
     - Chọn `Tất cả phòng ban` → mọi nhân viên đều thấy
     - Chọn 1 phòng cụ thể → chỉ phòng đó thấy + tự gửi notification cho họ
   - **Mã sản phẩm liên kết** (optional, dùng cho vòng quay)
   - **Thumbnail**: upload hoặc dán URL
   - **URL Video**: YouTube `youtu.be/...`, hoặc Google Drive `/d/<id>/view`
   - **URL Slide**: Google Drive / Lark public link
   - **Thời hạn** (toggle): bật để đặt ngày bắt đầu / kết thúc

### 5.2. Tạo Quiz inline cùng khóa học

Trong cùng modal, **toggle "Có muốn thêm quiz cho khóa học này không?"** → mở form quiz inline.

1. **Tiêu đề quiz**
2. **Điểm đạt** (mặc định 80)
3. **Số lượt làm tối đa** (mặc định 1)
4. **10 slot câu hỏi** — mỗi slot:
   - Nội dung câu hỏi
   - 4 đáp án A/B/C/D
   - **Bấm vào chữ A/B/C/D** để chọn đáp án đúng (chuyển emerald)
5. Có thể bấm **+ Thêm slot** nếu muốn > 10 câu

> **Nguyên tắc**: nhập tối thiểu 1 câu, slot trống sẽ bị bỏ qua. Mỗi câu cần tối thiểu 2 đáp án (A và B).

### 5.3. Sửa khóa học

Click hàng → modal sửa. Có thể đổi mọi trường trừ `course_id`.

Nếu khóa có quiz → form quiz tự load câu hỏi hiện tại → có thể sửa từng câu hoặc thêm câu mới.

### 5.4. Manager: scope phòng ban

Khi đăng nhập manager:
- Chỉ thấy khóa học của **phòng ban mình** + khóa **Tất cả phòng ban**
- Chỉ có thể sửa/xóa khóa **phòng ban mình**
- Khóa "Tất cả" → chỉ xem được

### 5.5. Trạng thái khóa học

- **Active** (Hoạt động): nhân viên thấy + có thể học
- **Inactive** (Tạm ẩn): không hiển thị trên frontend, dùng khi tạm dừng khóa

---

## 6. QUẢN LÝ BỘ CÂU HỎI (QUIZ)

Tab **Quiz** → liệt kê tất cả quiz độc lập với khóa học. Dùng khi cần xem tổng quan, hoặc sửa quiz không thuộc form khóa học.

> Khuyến nghị: tạo quiz **inline trong form khóa học** (mục 5.2) cho đơn giản. Tab Quiz dành cho trường hợp đặc biệt.

---

## 7. DASHBOARD TỔNG QUAN

Sidebar → **Tổng quan học tập** (khi role admin/manager → hiển thị Admin Dashboard).

### 7.1. KPI Cards (hàng đầu)

8 chỉ số chính:
- Tổng nhân viên
- Khóa học active
- Tỷ lệ hoàn thành %
- Khóa chưa ai học
- Nhân viên chưa học
- Quá hạn
- Điểm quiz TB
- Lượt fail quiz

### 7.2. Biểu đồ

- **Hoàn thành theo phòng ban** (bar chart): so sánh tỷ lệ % giữa các phòng
- **Trạng thái học tập** (pie chart): phân bổ Chưa học / Đang học / Hoàn thành / Quá hạn

### 7.3. Top khóa học

- **Top hoàn thành cao**: 5 khóa được hoàn thành nhiều nhất
- **Top fail quiz cao**: 5 khóa fail nhiều nhất → có thể nội dung cần review

### 7.4. Nhân viên quá hạn

Danh sách realtime ai đang quá deadline khóa nào. Click để hành động (gửi nhắc nhở).

### 7.5. Hoạt động gần đây

Timeline real-time: ai đang làm gì (hoàn thành / pass quiz / fail / bắt đầu).

---

## 8. ĐỒNG BỘ LARK BASE

### 8.1. Cấu hình lần đầu

1. Tạo **Anycross Flow** trên Lark:
   - Trigger: Webhook (Asynchronous)
   - Action: Lark Base → Create / Update Record
   - Map field: `summary_key` (PK), `Họ và tên`, `Email`, `Phòng ban`, `Khóa học`, `Tiến độ video`, `Điểm quizz`, `Trạng thái`, `Ngày cập nhật`...
2. Publish flow → copy Webhook URL
3. Trên app: Admin Dashboard → bấm icon ⚙️ bên nút Đồng bộ → dán URL → Lưu
4. URL được lưu trong localStorage + có thể set qua env `VITE_LARK_WEBHOOK_URL`

### 8.2. Chạy đồng bộ

Bấm nút **ĐỒNG BỘ LARK** ở Admin Dashboard.

- Progress bar trên cùng hiển thị % và stage hiện tại
- Mỗi record gửi tuần tự, cách 200ms (chống rate limit)
- Khoảng **1000 record / 4 phút**

### 8.3. Toast kết quả

- 🟢 **Đồng bộ thành công**: hiện số bản ghi tạo mới + đã xóa + tổng
- 🟡 **Đồng bộ chưa hoàn tất**: 1 số record bị fail
- 🔴 **Đồng bộ thất bại**: lỗi mạng / sai webhook URL

### 8.4. Upsert logic

Mỗi record có `summary_key = "{employee_id}_{course_id}"`. Anycross flow:
- **Search** record có summary_key này
- **Tìm thấy** → Update các field thay đổi
- **Không thấy** → Create record mới

→ Chạy đồng bộ **nhiều lần đều an toàn**, không tạo trùng.

---

## 9. XUẤT BÁO CÁO EXCEL

Bấm nút **XUẤT EXCEL** ở Admin Dashboard.

- File Excel `.xlsx` tải về tự động
- Mỗi dòng = 1 cặp (nhân viên × khóa học)
- Cột: Họ tên, Email, Phòng ban, Khóa học, Nhóm, Tiến độ video %, Điểm quiz, Xếp loại, Thời gian làm bài, Trạng thái, Ngày cập nhật

> Manager xuất Excel sẽ chỉ có dữ liệu **phòng ban mình**. Admin xuất sẽ có **toàn hệ thống**.

---

## 10. SYSTEM SETTINGS (ADMIN)

Tab **Cài đặt hệ thống** trong Quản trị. Cho phép:

- Cấu hình **mật khẩu mặc định** khi tạo nhân viên mới (mặc định `Doscom@2026`)
- Cấu hình **email confirmation** (tắt/bật)
- Logging / debug toggles

> Cài đặt nhạy cảm như Supabase URL / Anon Key → chỉ đổi qua **file .env** + redeploy. Không expose trên UI.

---

## QUY TRÌNH ĐIỂN HÌNH

### Quy trình A: Tạo khóa học mới cho phòng kinh doanh

```
1. Vào Quản trị → Khóa học → + Thêm khóa học
2. Tên: "Kỹ năng bán hàng B2B"
3. Nhóm: Nội bộ
4. Danh mục: Đào tạo kỹ năng
5. Phòng ban: Phòng kinh doanh
6. Upload video (Drive)
7. Bật toggle quiz → nhập 10 câu
8. Set deadline 14 ngày
9. Tạo mới
   → Hệ thống tự gửi notification chuông cho mọi nhân viên Phòng kinh doanh
```

### Quy trình B: Theo dõi tiến độ + nhắc nhở

```
1. Vào Dashboard
2. Xem "Nhân viên quá hạn" → có 3 người
3. Tìm số điện thoại / Lark ID trong tab Nhân viên
4. Nhắc nhở qua Lark
5. Sau 3 ngày, đồng bộ Lark Base → check progress mới
```

### Quy trình C: Báo cáo cuối tháng

```
1. Vào Dashboard
2. Bấm XUẤT EXCEL
3. Bấm ĐỒNG BỘ LARK (để cập nhật báo cáo realtime)
4. Mở Excel → tổng hợp pivot table theo phòng ban
5. Trình BLĐ kèm screenshot Dashboard
```

---

## LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

### Lỗi: "RLS chặn thao tác" khi thêm/sửa khóa học
**Nguyên nhân**: Supabase Row Level Security chưa cấp quyền admin.
**Fix**: Chạy file `supabase/fix_admin_rls.sql` trên Supabase SQL Editor.

### Lỗi: "Không lưu được hồ sơ nhân viên" sau khi tạo auth thành công
**Nguyên nhân**: RLS chưa cấp INSERT cho bảng `employees`.
**Fix**: Chạy file `supabase/fix_employees_rls.sql`.

### Lỗi: Email đã đăng ký nhưng không tìm thấy trong Supabase
**Nguyên nhân**: Auth user tồn tại nhưng UI lọc unconfirmed user.
**Fix**:
```sql
SELECT * FROM auth.users WHERE email = 'email-bị-trùng@...';
DELETE FROM auth.users WHERE email = 'email-bị-trùng@...';
```

### Lỗi: Đồng bộ Lark báo Webhook URL không hợp lệ
**Fix**: URL phải có domain `larksuite.com` hoặc `feishu.cn`. Tạo lại Flow trên Anycross nếu URL cũ đã hết hạn.

### Lỗi: Manager không thấy khóa học cần quản lý
**Nguyên nhân**: Field `department` của employee không khớp với `department` của course.
**Fix**: Kiểm tra chính tả phòng ban (vd: "Phòng kinh doanh" vs "Kinh doanh") — cần thống nhất.

---

*Tài liệu phiên bản 1.0 — Cập nhật: 12/05/2026*
