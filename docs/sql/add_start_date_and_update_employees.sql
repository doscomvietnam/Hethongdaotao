-- ============================================================
-- Migration: thêm cột start_date (ngày vào làm) vào bảng employees
-- và cập nhật phòng ban, vị trí, ngày vào làm theo danh sách nhân sự
-- ============================================================

-- 1. Thêm cột start_date nếu chưa có
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS start_date date;

-- 2. Cập nhật từng nhân viên theo tên đầy đủ
UPDATE employees SET department = 'Chủ tịch',           position = 'Chủ tịch Công ty',                    start_date = '2020-06-02' WHERE full_name = 'Thắng Vũ';
UPDATE employees SET department = 'Tài chính-Kế toán',  position = 'Trợ lý Chủ tịch',                     start_date = '2023-02-01' WHERE full_name = 'Vũ Khánh Huyền';
UPDATE employees SET department = 'Tài chính-Kế toán',  position = 'Nhân viên kế toán',                   start_date = '2022-09-01' WHERE full_name = 'Nguyễn Thị Linh Trang';
UPDATE employees SET department = 'Kinh doanh',         position = 'Phó Giám đốc vận hành',               start_date = '2024-02-19' WHERE full_name = 'Nguyễn Tuấn Anh';
UPDATE employees SET department = 'Kinh doanh',         position = 'Leader Kinh doanh',                    start_date = '2023-05-08' WHERE full_name = 'Kiều Trúc Tùng';
UPDATE employees SET department = 'Kinh doanh',         position = 'Nhân viên Kinh doanh',                 start_date = '2023-04-01' WHERE full_name = 'Lê Thị Thùy Anh';
UPDATE employees SET department = 'Marketing',          position = 'Leader ADS',                           start_date = '2024-01-01' WHERE full_name = 'Hoàng Xuân Duy';
UPDATE employees SET department = 'Marketing',          position = 'Nhân viên vận hành sàn TMĐT',          start_date = '2023-12-18' WHERE full_name = 'Phan Minh Thắng';
UPDATE employees SET department = 'Marketing',          position = 'Leader Content',                       start_date = '2024-01-15' WHERE full_name = 'Hoàng Thị Yến';
UPDATE employees SET department = 'Marketing',          position = 'Leader Media',                         start_date = '2025-01-07' WHERE full_name = 'An Bảo Long';
UPDATE employees SET department = 'Kinh doanh',         position = 'Nhân viên kỹ thuật',                   start_date = '2022-11-22' WHERE full_name = 'Bùi Văn Thức';
UPDATE employees SET department = 'Kinh doanh',         position = 'Quản lý cửa hàng chi nhánh HCM',      start_date = '2023-12-25' WHERE full_name = 'Nguyễn Quốc Huy';
UPDATE employees SET department = 'Marketing',          position = 'Nhân viên vận hành sàn TMĐT',          start_date = '2024-07-12' WHERE full_name = 'Mai Đức Hiệp';
UPDATE employees SET department = 'Marketing',          position = 'Nhân viên thiết kế',                   start_date = '2025-11-25' WHERE full_name = 'Nguyễn Trọng Bảo';
UPDATE employees SET department = 'Kinh doanh',         position = 'Nhân viên Kinh doanh',                 start_date = '2024-07-01' WHERE full_name = 'Tống Thị Huyền';
UPDATE employees SET department = 'Tổng hợp',           position = 'Phó Leader HCNS',                     start_date = '2024-08-09' WHERE full_name = 'Nguyễn Thị Thùy Linh';
UPDATE employees SET department = 'Marketing',          position = 'Leader TMĐT',                          start_date = '2025-03-17' WHERE full_name = 'Trần Văn Tình';
UPDATE employees SET department = 'Kinh doanh',         position = 'Nhân viên chăm sóc khách hàng',        start_date = '2025-04-01' WHERE full_name = 'Nguyễn Thanh Trúc';
UPDATE employees SET department = 'Kinh doanh',         position = 'Nhân viên kỹ thuật',                   start_date = '2025-04-21' WHERE full_name = 'Bùi Trung Sơn';
UPDATE employees SET department = 'Kho',                position = 'Nhân viên kho',                        start_date = '2025-05-05' WHERE full_name = 'Nguyễn Trọng Tuấn';
UPDATE employees SET department = 'Marketing',          position = 'Nhân viên vận hành sàn TMĐT',          start_date = '2025-07-02' WHERE full_name = 'Trần Thị Thu';
UPDATE employees SET department = 'Marketing',          position = 'Nhân viên thiết kế',                   start_date = '2025-07-28' WHERE full_name = 'Đào Hường';
UPDATE employees SET department = 'Kinh doanh',         position = 'Nhân viên chăm sóc khách hàng',        start_date = '2025-08-15' WHERE full_name = 'Trần Thùy Dương';
UPDATE employees SET department = 'Kho',                position = 'Nhân viên kho',                        start_date = '2025-08-18' WHERE full_name = 'Lê Duy Tú';
UPDATE employees SET department = 'Kinh doanh',         position = 'Nhân viên Kinh doanh',                 start_date = '2025-08-19' WHERE full_name = 'Nguyễn Quang Minh';
UPDATE employees SET department = 'Marketing',          position = 'Nhân viên Booking',                    start_date = '2025-10-27' WHERE full_name = 'Nguyễn Thị Kim Ngân';
UPDATE employees SET department = 'Tài chính-Kế toán',  position = 'Nhân viên kế toán',                   start_date = '2025-12-15' WHERE full_name = 'Đoàn Thị Hồng Ngọc';
UPDATE employees SET department = 'Marketing',          position = 'Nhân viên content',                    start_date = '2025-12-15' WHERE full_name = 'Trương Cẩm Bình';
UPDATE employees SET department = 'Công nghệ',          position = 'Trợ lý vận hành',                     start_date = '2026-01-12' WHERE full_name = 'Ngô Văn Phát';
UPDATE employees SET department = 'Công nghệ',          position = 'Trợ lý vận hành',                     start_date = '2026-03-02' WHERE full_name = 'Nguyễn Hương Lan';
UPDATE employees SET department = 'Marketing',          position = 'Nhân viên content',                    start_date = '2026-03-02' WHERE full_name = 'Đỗ Minh Lương';
UPDATE employees SET department = 'Công nghệ',          position = 'Trợ lý vận hành',                     start_date = '2026-03-11' WHERE full_name = 'Vũ Thị Quỳnh Trang';
UPDATE employees SET department = 'Marketing',          position = 'Nhân viên ADS',                        start_date = '2026-04-06' WHERE full_name = 'Trần Phương Nam';
UPDATE employees SET department = 'Kinh doanh',         position = 'Nhân viên chăm sóc khách hàng',        start_date = '2026-04-13' WHERE full_name = 'Đoàn Anh Phương';
UPDATE employees SET department = 'Marketing',          position = 'Trưởng phòng Marketing',               start_date = '2026-04-22' WHERE full_name = 'Ngô Anh Duy';
UPDATE employees SET department = 'Tài chính-Kế toán',  position = 'Nhân viên kế toán',                   start_date = '2026-05-04' WHERE full_name = 'Nguyễn Thị Nguyệt';
UPDATE employees SET department = 'Tổng hợp',           position = 'Nhân viên mua hàng',                  start_date = '2026-05-11' WHERE full_name = 'Lê Nguyễn Trà My';
UPDATE employees SET department = 'Kho',                position = 'Quản lý kho',                          start_date = '2026-06-01' WHERE full_name = 'Cao Hữu Trí';
UPDATE employees SET department = 'Marketing',          position = 'Leader Booking',                       start_date = '2026-06-08' WHERE full_name = 'Nguyễn Thị Dung';
UPDATE employees SET department = 'Marketing',          position = 'Nhân viên content',                    start_date = '2026-06-09' WHERE full_name = 'Phùng Lê Minh Tuấn';
UPDATE employees SET department = 'Kho',                position = 'Nhân viên kho',                        start_date = '2026-06-15' WHERE full_name = 'Nguyễn Thanh Tùng';
UPDATE employees SET department = 'Kho',                position = 'Nhân viên kho',                        start_date = '2026-06-16' WHERE full_name = 'Lê Minh Đức';
UPDATE employees SET department = 'Kinh doanh',         position = 'Nhân viên chăm sóc khách hàng',        start_date = '2026-06-17' WHERE full_name = 'Hà Thị Thanh Tâm';
