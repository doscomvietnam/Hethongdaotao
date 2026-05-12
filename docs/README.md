# Tài liệu Hệ thống Đào tạo Doscom

Bộ tài liệu hướng dẫn sử dụng và triển khai.

## File trong thư mục này

| File | Đối tượng | Mục đích |
|---|---|---|
| [HUONG_DAN_NHAN_VIEN.md](HUONG_DAN_NHAN_VIEN.md) | **Nhân viên** | Hướng dẫn sử dụng đầy đủ — đăng nhập, học, làm bài, vòng quay |
| [HUONG_DAN_QUAN_LY.md](HUONG_DAN_QUAN_LY.md) | **Manager / Admin** | Hướng dẫn quản trị — tạo khóa, theo dõi, đồng bộ Lark, xuất báo cáo |
| [TRIEN_KHAI.md](TRIEN_KHAI.md) | **HR / Admin** | Kế hoạch rollout 4 tuần, mẫu thông báo, checklist go-live, KPI |
| [ARCHITECTURE.md](ARCHITECTURE.md) | **Developer** | Kiến trúc kỹ thuật, database schema, services |
| [diagrams/](diagrams/) | **Developer** | Sơ đồ Mermaid: schema DB, flow auth, kiến trúc |

## Cách phân phối cho nhân viên

1. **In file `HUONG_DAN_NHAN_VIEN.md` thành PDF** (dùng VS Code extension hoặc Pandoc) → gửi qua Lark / email
2. Hoặc publish file `.md` lên Lark Wiki / Notion → share link
3. **Hoặc** nhân viên xem trực tiếp trong app: sidebar → **Hướng dẫn sử dụng** (đã nhúng trong app)

## Cách phân phối cho manager/admin

1. Họp riêng training 2-3 buổi như mục **5. Kịch bản đào tạo** trong [TRIEN_KHAI.md](TRIEN_KHAI.md)
2. Gửi file `HUONG_DAN_QUAN_LY.md` qua Lark
3. Lưu vào Lark Wiki làm tài liệu reference

## Trước khi triển khai

Xem checklist trong [TRIEN_KHAI.md mục 8](TRIEN_KHAI.md#8-checklist-trước-khi-rollout).

## Phiên bản

Bộ tài liệu này tương ứng với code commit `a71af6f` trở lên (có tính năng Vòng quay kiểm tra + Hướng dẫn nhúng).
