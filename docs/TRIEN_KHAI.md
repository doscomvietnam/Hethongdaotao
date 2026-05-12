# KẾ HOẠCH TRIỂN KHAI HỆ THỐNG ĐÀO TẠO DOSCOM

Tài liệu dành cho **HR / Quản lý / Admin** để rollout hệ thống tới toàn thể nhân viên.

---

## 1. MỤC TIÊU TRIỂN KHAI

- 100% nhân viên đăng nhập hệ thống trong **tuần 1**
- 80% nhân viên hoàn thành khóa học bắt buộc trong **tháng 1**
- Toàn bộ phòng ban có ít nhất 1 quản lý được training admin trong **tuần 2**

---

## 2. LỘ TRÌNH 4 TUẦN

### Tuần 1 — Khởi động & cấp tài khoản

| Ngày | Hành động | Phụ trách |
|---|---|---|
| **T2** | HR import danh sách nhân viên vào hệ thống — tạo tài khoản auth + cấp mật khẩu mặc định `Doscom@2026` | HR + Admin |
| **T2** | Gửi email thông báo + mật khẩu khởi tạo qua kênh nội bộ (Lark / Email) | HR |
| **T3** | Toàn bộ nhân viên đăng nhập lần đầu + đổi mật khẩu + cập nhật hồ sơ | Mọi nhân viên |
| **T4** | Họp giới thiệu hệ thống (online / offline) — chiếu màn hình demo các tính năng chính | HR + IT |
| **T5** | Gửi tài liệu [HUONG_DAN_NHAN_VIEN.md](HUONG_DAN_NHAN_VIEN.md) qua Lark | HR |

### Tuần 2 — Khóa học bắt buộc đợt 1

| Ngày | Hành động | Phụ trách |
|---|---|---|
| **T2** | Admin tạo các khóa học bắt buộc + gán deadline 14 ngày | Admin / Đào tạo |
| **T2** | Hệ thống tự gửi thông báo chuông cho nhân viên có khóa mới | Tự động |
| **T2-T6** | Nhân viên xem video + làm quiz | Mọi nhân viên |
| **T5** | Manager dashboard kiểm tra tiến độ phòng ban → nhắc nhở nhân viên chậm | Manager |
| **T7** | Báo cáo tuần — đồng bộ Lark Base | Admin |

### Tuần 3 — Mở rộng & vòng quay

| Ngày | Hành động | Phụ trách |
|---|---|---|
| **T2** | Mở tính năng **Vòng quay kiểm tra sản phẩm** | Admin |
| **T2** | Treo thưởng / vinh danh top hoàn thành | HR |
| **T3-T7** | Nhân viên ôn tập sản phẩm qua vòng quay | Mọi nhân viên |

### Tuần 4 — Đánh giá & cải tiến

| Ngày | Hành động | Phụ trách |
|---|---|---|
| **T2** | Xuất Excel báo cáo tháng 1 → review với BLĐ | Admin |
| **T3** | Khảo sát nhanh: thu phản hồi UX, đề xuất tính năng | HR |
| **T5** | Quyết định lộ trình tháng 2: khóa học mới, deadline mới | BLĐ |

---

## 3. PHÂN QUYỀN VAI TRÒ

### 3.1. Admin (Quản trị viên)
- **Quyền**: Toàn quyền — tạo / sửa / xóa khóa học, nhân viên, sản phẩm, quiz
- **Số lượng**: Tối đa 2-3 người (HR trưởng + IT)
- **Trách nhiệm**:
  - Quản lý tài khoản nhân viên
  - Tạo khóa học mới
  - Đồng bộ Lark Base định kỳ
  - Xuất báo cáo tổng

### 3.2. Manager (Quản lý phòng ban)
- **Quyền**: Xem & quản lý khóa học của phòng ban mình
- **Số lượng**: 1 người / phòng ban (trưởng phòng)
- **Trách nhiệm**:
  - Theo dõi tiến độ nhân viên trong phòng
  - Tạo khóa học nội bộ cho phòng (vd: quy trình phòng công nghệ)
  - Nhắc nhở nhân viên chậm tiến độ

### 3.3. Employee (Nhân viên thường)
- **Quyền**: Chỉ học, làm quiz, xem hồ sơ cá nhân
- **Trách nhiệm**:
  - Hoàn thành khóa học đúng deadline
  - Làm quiz đạt ≥ 8/10
  - Cập nhật hồ sơ cá nhân đầy đủ

---

## 4. MẪU THÔNG BÁO CHO NHÂN VIÊN

### 4.1. Email khởi tạo tài khoản (HR gửi tuần 1)

```
Tiêu đề: [DOSCOM] Tài khoản hệ thống đào tạo - Vui lòng đăng nhập

Kính gửi anh/chị {{Họ tên}},

Để chuẩn hóa hoạt động đào tạo nội bộ, Doscom triển khai
Hệ thống Đào tạo trực tuyến. Anh/chị vui lòng:

1. Truy cập: https://hethongdaotao.doscom.vn (hoặc địa chỉ thực tế)
2. Đăng nhập:
   - Email:     {{email công ty}}
   - Mật khẩu:  Doscom@2026
3. Đổi mật khẩu ngay sau lần đăng nhập đầu tiên
4. Cập nhật hồ sơ cá nhân (số điện thoại, ảnh đại diện)

Tài liệu hướng dẫn chi tiết: đính kèm file PDF
Hỗ trợ: liên hệ HR hoặc IT theo thông tin cuối tài liệu.

Vui lòng hoàn tất các bước trên trước ngày {{deadline}}.

Trân trọng,
Phòng Nhân sự Doscom
```

### 4.2. Tin nhắn Lark nhắc deadline (HR gửi tuần 2)

```
🔔 Nhắc nhở đào tạo

Anh/chị còn {{N}} khóa học chưa hoàn thành, deadline gần nhất: {{date}}

Vui lòng vào https://... → menu "Khóa học đào tạo" → hoàn tất trong tuần này.

Khóa quá hạn sẽ bị ghi nhận. Mọi câu hỏi → reply trong nhóm.
```

### 4.3. Tin nhắn mở tính năng mới

```
🎮 Tính năng mới: Vòng quay kiểm tra sản phẩm

Doscom mở tính năng vòng quay ôn tập:
- Vào menu "Kiểm tra" → chọn Doscom / Noma
- Quay vòng → trúng sản phẩm nào làm bài đó
- Top 5 hoàn thành nhanh nhất sẽ được vinh danh!

Xem hướng dẫn: ... (link hoặc menu Hướng dẫn sử dụng trong app)
```

---

## 5. KỊCH BẢN ĐÀO TẠO ADMIN/MANAGER

### Buổi 1: Cài đặt tài khoản (30 phút)
- Demo đăng nhập, đổi mật khẩu, cập nhật hồ sơ
- Tour giao diện: sidebar, navbar, dashboard

### Buổi 2: Vai trò Manager (1 giờ)
- Truy cập trang **Quản trị → Khóa học**
- Tạo khóa học mới cho phòng ban
- Đính kèm video / slide / quiz inline
- Set deadline + chọn phòng ban
- Theo dõi tiến độ phòng ban qua Dashboard

### Buổi 3: Vai trò Admin (1.5 giờ)
- Quản lý nhân viên: thêm / sửa / xóa
- Quản lý sản phẩm: tạo / sửa
- Quản lý quiz: tạo bộ câu hỏi
- Đồng bộ Lark Base
- Xuất Excel báo cáo
- System Settings

---

## 6. KPI ĐÁNH GIÁ THÀNH CÔNG

| Chỉ số | Mục tiêu | Cách đo |
|---|---|---|
| Tỷ lệ kích hoạt tài khoản | ≥ 100% trong 7 ngày | Dashboard Admin → KPI "Nhân viên active" |
| Tỷ lệ hoàn thành khóa bắt buộc | ≥ 80% sau 30 ngày | Dashboard → "Tỷ lệ hoàn thành" |
| Điểm quiz trung bình | ≥ 8.0 | Dashboard → "Điểm quiz TB" |
| Tỷ lệ fail quiz | ≤ 15% | Dashboard → "Lượt fail quiz" |
| Số nhân viên quá hạn | ≤ 5% | Dashboard → "Quá hạn" |
| Đồng bộ Lark thành công | Tuần / lần | Toast notification "Đồng bộ thành công" |

---

## 7. RỦI RO & CÁCH XỬ LÝ

| Rủi ro | Biện pháp |
|---|---|
| **Nhân viên quên mật khẩu hàng loạt** | HR chuẩn bị sẵn quy trình reset, cử 1 người trực hỗ trợ tuần đầu |
| **Video upload lỗi / không phát** | Test trước trên Chrome, Safari, mobile trước khi rollout. Có backup PDF nếu video lỗi |
| **Email công ty không nhận được thông báo** | Add domain `noreply@doscom...` vào whitelist mail server |
| **Nhân viên không có thời gian học** | Manager phối hợp sắp xếp khung giờ học trong tuần (vd: 30 phút mỗi sáng thứ 6) |
| **Chống gian lận quiz** | Hệ thống tự phát hiện chuyển tab + tự nộp sau 3 vi phạm. Manager review trường hợp bất thường |
| **Server down / mạng chậm** | IT chuẩn bị hệ thống backup; thông báo qua Lark khi có downtime |

---

## 8. CHECKLIST TRƯỚC KHI ROLLOUT

Trước ngày bấm nút "Go-live":

- [ ] Tất cả nhân viên có **email công ty** active
- [ ] Admin đã import danh sách nhân viên vào hệ thống
- [ ] Có ít nhất **3 khóa học mẫu** đã sẵn sàng (video + slide + quiz)
- [ ] **RLS policies** đã set đúng cho mọi bảng (chạy `fix_admin_rls.sql` + `fix_employees_rls.sql`)
- [ ] **Lark webhook URL** đã cấu hình + test sync thành công
- [ ] Đã test toàn bộ flow với 1 tài khoản dummy: đăng nhập → đổi pass → xem video → làm quiz → xem kết quả
- [ ] Đã test trên **Chrome / Edge / Safari / Mobile**
- [ ] Có **kênh hỗ trợ** (Lark group / Hotline IT) sẵn sàng
- [ ] **Tài liệu HUONG_DAN_NHAN_VIEN.md** đã in PDF / publish lên Lark Wiki
- [ ] **Mật khẩu mặc định** `Doscom@2026` đã được ghi rõ trong email gửi nhân viên
- [ ] **Backup database** ngay trước khi go-live

---

## 9. LIÊN HỆ

| Vai trò | Người phụ trách | Liên hệ |
|---|---|---|
| **Project Owner** | (điền tên) | (email / Lark) |
| **HR Lead** | (điền tên) | (email / Lark) |
| **IT Support** | (điền tên) | (email / Lark) |
| **Đào tạo Lead** | (điền tên) | (email / Lark) |

---

*Tài liệu phiên bản 1.0 — Cập nhật: 12/05/2026*
