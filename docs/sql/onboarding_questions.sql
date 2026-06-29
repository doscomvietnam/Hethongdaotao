-- ============================================================
-- 30 CÂU HỎI KIỂM TRA ONBOARDING (Doscom Holdings Policy)
-- bank_type = 'onboarding' trong bảng daily_questions
-- Chạy sau khi đã chạy: fix_bank_type_constraint.sql + onboarding_test_schema.sql
-- ============================================================

-- Xoá câu hỏi onboarding cũ (nếu đã có)
DELETE FROM daily_questions WHERE bank_type = 'onboarding';

INSERT INTO daily_questions
  (bank_type, question_text, option_a, option_b, option_c, option_d, correct_answer, category)
VALUES

-- 1
('onboarding',
 'Toàn bộ công tác chấm công tại Công ty TNHH Doscom Holdings được thực hiện bằng hình thức nào?',
 'Chấm công bằng vân tay đặt tại văn phòng.',
 'Chấm công bằng định vị GPS qua ứng dụng Lark.',
 'Chấm công bằng thẻ từ ra vào văn phòng.',
 'Gửi email báo cáo ngày công cho quản lý trực tiếp hàng ngày.',
 'B', 'Nội quy'),

-- 2
('onboarding',
 'Công ty TNHH Doscom Holdings quy định thế nào về hình thức làm việc online tại nhà?',
 'Áp dụng cho toàn bộ nhân viên khi có lý do cá nhân chính đáng.',
 'Chỉ áp dụng đối với bộ phận Chăm sóc khách hàng và Kỹ thuật.',
 'Công ty không áp dụng hình thức làm việc online tại nhà.',
 'Cho phép nhân viên làm việc online 01 ngày/tuần.',
 'C', 'Nội quy'),

-- 3
('onboarding',
 'Khung giờ làm việc của ca hành chính từ Thứ 2 đến Thứ 7 hàng tuần được quy định như thế nào?',
 'Từ 8h00 đến 17h00 hàng ngày (Thứ 7 về sớm 30 phút).',
 'Từ 8h30 đến 17h30 hàng ngày (Thứ 7 về sớm 30 phút).',
 'Từ 9h00 đến 18h00 hàng ngày (Thứ 7 về sớm 30 phút).',
 'Từ 8h30 đến 18h00 hàng ngày (Thứ 7 về sớm 30 phút).',
 'D', 'Nội quy'),

-- 4
('onboarding',
 'Trong một ngày làm việc bình thường, cán bộ nhân viên phải thực hiện chấm công trên ứng dụng Lark bao nhiêu lần?',
 '01 lần duy nhất vào đầu giờ sáng khi đến công ty.',
 '02 lần: Check in khi đến và Check out khi về.',
 '04 lần: Check in/out đầu giờ và Check in/out giữa ca nghỉ.',
 'Không bắt buộc số lần chấm công, chỉ cần quản lý xác nhận.',
 'B', 'Nội quy'),

-- 5
('onboarding',
 'Trường hợp không thể chấm công do lỗi phần mềm Lark hoặc các lý do khách quan khác, nhân viên cần phải làm gì?',
 'Tự chấm công bù vào ngày làm việc tiếp theo.',
 'Báo cáo bằng miệng cho Trưởng phòng/ban vào kỳ tính lương cuối tháng.',
 'Báo ngay cho phòng Nhân sự để ghi nhận thời gian chấm công và khắc phục sự cố.',
 'Chụp ảnh màn hình điện thoại tự lưu giữ và không cần báo ai.',
 'C', 'Nội quy'),

-- 6
('onboarding',
 'Nếu nhân viên phải đi giải quyết công việc công ty bên ngoài trước giờ làm việc sáng hoặc về muộn không thể quay lại công ty, họ phải thực hiện thủ tục gì?',
 'Nhắn tin xin phép đồng nghiệp chung nhóm check-in hộ trên Lark.',
 'Làm phiếu phê duyệt "Out off office" trong mục phê duyệt trên Lark và được Trưởng phòng/ban phê duyệt.',
 'Gọi điện thoại trực tiếp xin phép Giám đốc và không cần làm đơn từ.',
 'Viết biên bản giấy giải trình nộp lại cho phòng Hành chính Nhân sự sau 3 ngày.',
 'B', 'Nội quy'),

-- 7
('onboarding',
 'Phiếu "Đơn xin đi muộn/về sớm" lý do cá nhân trường hợp về sớm phải được gửi phê duyệt trên Lark trước thời điểm về bao lâu?',
 'Trước ít nhất 10 phút.',
 'Trước ít nhất 15 phút.',
 'Trước ít nhất 30 phút.',
 'Trước ít nhất 1 tiếng.',
 'B', 'Nội quy'),

-- 8
('onboarding',
 'Phiếu "Đơn xin đi muộn/về sớm" lý do cá nhân trường hợp đi muộn phải được gửi phê duyệt trên Lark trước thời điểm nào?',
 'Trước 8h30 cùng ngày.',
 'Trước 7h00 cùng ngày.',
 'Trước 22h00 của ngày hôm trước.',
 'Trước 12h00 trưa cùng ngày.',
 'B', 'Nội quy'),

-- 9
('onboarding',
 'Khi muốn xin nghỉ phép từ 03 ngày trở lên, nhân viên phải gửi đơn xin nghỉ phép trước tối thiểu bao lâu?',
 'Trước tối thiểu 03 ngày.',
 'Trước tối thiểu 05 ngày.',
 'Trước tối thiểu 01 tuần.',
 'Trước tối thiểu 10 ngày.',
 'C', 'Nội quy'),

-- 10
('onboarding',
 'Trường hợp xin nghỉ phép 02 ngày, nhân viên phải nộp đơn xin nghỉ trên Lark trước tối thiểu bao lâu?',
 'Trước tối thiểu 01 ngày.',
 'Trước tối thiểu 02 ngày.',
 'Trước tối thiểu 03 ngày.',
 'Trước tối thiểu 05 ngày.',
 'C', 'Nội quy'),

-- 11
('onboarding',
 'Trường hợp xin nghỉ phép 01 ngày, nhân viên phải nộp đơn xin nghỉ trên Lark trước tối thiểu bao lâu?',
 'Trước giờ bắt đầu làm việc ngày nghỉ 30 phút.',
 'Trước tối thiểu 01 ngày.',
 'Trước tối thiểu 02 ngày.',
 'Phải nộp trước từ tuần trước.',
 'B', 'Nội quy'),

-- 12
('onboarding',
 'Trường hợp nghỉ không xin phép hoặc không được phê duyệt nghỉ (Nghỉ không lý do) 1/2 ngày bị phạt như thế nào?',
 'Phạt 2 điểm vi phạm quy chế.',
 'Phạt 1 ngày lương.',
 'Phạt 2 ngày lương.',
 'Không tính lương buổi nghỉ đó và phạt cảnh cáo.',
 'B', 'Nội quy'),

-- 13
('onboarding',
 'Trường hợp nghỉ không xin phép hoặc không được phê duyệt nghỉ (Nghỉ không lý do) 01 ngày bị phạt thế nào?',
 'Phạt trừ phép năm và phạt 1 ngày lương.',
 'Phạt 2 ngày lương.',
 'Phạt 3 ngày lương.',
 'Đình chỉ công tác 03 ngày không hưởng lương.',
 'B', 'Nội quy'),

-- 14
('onboarding',
 'Mức xử phạt đối với hành vi đi muộn/về sớm quá 5 lần trở lên, mỗi lần vi phạm phạt bao nhiêu điểm?',
 'Phạt 0.5 điểm.',
 'Phạt 1 điểm.',
 'Phạt 1.5 điểm.',
 'Phạt 2 điểm.',
 'A', 'Nội quy'),

-- 15
('onboarding',
 'Theo nguyên tắc sử dụng tài sản, hành vi nào sau đây cán bộ nhân viên KHÔNG được tự ý thực hiện?',
 'Trao đổi, cho mượn, sử dụng chéo giữa các cá nhân/bộ phận.',
 'Di chuyển tài sản sang vị trí khác.',
 'Cả A và B đều đúng.',
 'Cài đặt các phần mềm phục vụ cho công việc cá nhân.',
 'C', 'Nội quy'),

-- 16
('onboarding',
 'Mọi nhu cầu điều chuyển, sử dụng chung tài sản của Công ty phải được phê duyệt bởi cơ quan/cá nhân nào?',
 'Do các cá nhân/bộ phận tự thỏa thuận và ký biên bản ghi nhớ.',
 'Phải được Phòng HCNS hoặc cấp quản lý trực tiếp phê duyệt.',
 'Phải được Chủ tịch Công ty phê duyệt bằng văn bản chính thức.',
 'Phải được Bộ phận Kế toán kiểm kê và đồng ý.',
 'B', 'Nội quy'),

-- 17
('onboarding',
 'Số ngày phép hưởng nguyên lương tiêu chuẩn cho nhân viên chính thức là bao nhiêu ngày?',
 '0.5 ngày phép/tháng, tương đương 6 ngày phép/năm.',
 '01 ngày phép/tháng, tương đương 12 ngày phép/năm, thâm niên 5 năm + 01 ngày phép.',
 '1.5 ngày phép/tháng, tương đương 18 ngày phép/năm.',
 '02 ngày phép/tháng, tương đương 24 ngày phép/năm.',
 'B', 'Nội quy'),

-- 18
('onboarding',
 'Theo quy chế, nguyên tắc sử dụng ngày phép hằng tháng được quy định như thế nào?',
 'Được cộng dồn tối đa 03 ngày phép sang các tháng tiếp theo trong cùng quý.',
 'Ngày phép của tháng nào phải sử dụng hết tháng đó và không được tính cộng dồn vào các tháng tiếp theo.',
 'Nhân viên có thể dồn toàn bộ 12 ngày phép để nghỉ một lần vào cuối năm.',
 'Ngày phép chưa dùng hết sẽ được tự động quy đổi thành ngày nghỉ phép năm của năm tiếp theo.',
 'B', 'Nội quy'),

-- 19
('onboarding',
 'Ngày thành lập công ty TNHH Doscom Holdings là ngày bao nhiêu?',
 'Ngày 1/6/2020.',
 'Ngày 2/6/2020.',
 'Ngày 1/6/2022.',
 'Ngày 2/6/2021.',
 'B', 'Văn hóa'),

-- 20
('onboarding',
 'Hành vi "Làm việc riêng trong giờ làm, xem phim, chơi game,..." bị phát hiện sẽ bị trừ bao nhiêu điểm phạt vào lương?',
 'Trừ 0.25 điểm phạt.',
 'Trừ 0.5 điểm phạt.',
 'Trừ 1 điểm phạt.',
 'Trừ 2 điểm phạt.',
 'B', 'Nội quy'),

-- 21
('onboarding',
 'Lỗi "Không thực hiện đúng quy trình làm việc theo quy định" sẽ bị áp dụng chế tài xử phạt là bao nhiêu điểm phạt?',
 'Trừ 0.5 điểm phạt.',
 'Trừ 1 điểm phạt.',
 'Trừ 2 điểm phạt.',
 'Trừ 3 điểm phạt.',
 'C', 'Nội quy'),

-- 22
('onboarding',
 'Theo Thông báo số 2705/2025/TB-DC, cán bộ nhân viên cần phản hồi tin nhắn trong vòng bao lâu kể từ khi nhận được?',
 'Trong vòng 15 phút.',
 'Trong vòng 30 phút.',
 'Trong vòng 45 phút.',
 'Trong ngày làm việc.',
 'B', 'Nội quy'),

-- 23
('onboarding',
 'Nếu chưa thể trả lời chi tiết nội dung tin nhắn ngay lập tức, nhân viên cần xử lý như thế nào?',
 'Chờ đến khi có đầy đủ thông tin chi tiết mới phản hồi.',
 'Bỏ qua tin nhắn và trả lời sau.',
 'Gửi tin nhắn xác nhận tạm thời.',
 'Chỉ sử dụng emoji để kết thúc cuộc trò chuyện.',
 'C', 'Nội quy'),

-- 24
('onboarding',
 'Khi được tag tên trực tiếp (@tên) trong các nhóm làm việc, hành vi nào sau đây đúng quy định?',
 'Không cần phản hồi nếu không liên quan trực tiếp đến nhiệm vụ của mình.',
 'Chỉ cần thả biểu tượng cảm xúc (emoji) là đủ.',
 'Phản hồi trong vòng 30 phút hoặc thông báo cụ thể thời điểm sẽ phản hồi.',
 'Chờ đến khi kết thúc ngày làm việc mới phản hồi một thể.',
 'C', 'Nội quy'),

-- 25
('onboarding',
 'Tuyên ngôn văn hóa cải tiến chính thức của Doscom Holdings được quy định như thế nào?',
 '"Không ngừng sáng tạo, dẫn đầu công nghệ thông minh".',
 '"Cải tiến liên tục là chìa khóa của sự phát triển bền vững".',
 '"Mỗi ngày tại Doscom là một lần hệ thống, quy trình hoặc con người được cải tiến tốt hơn hôm qua".',
 '"Chủ động tìm kiếm giải pháp và tối ưu hóa chi phí vận hành".',
 'C', 'Văn hóa'),

-- 26
('onboarding',
 'Tầm nhìn chiến lược của Doscom Holdings đến năm 2030 định vị công ty phát triển trở thành gì?',
 'Hệ sinh thái công nghệ hàng đầu Việt Nam chuyên bán lẻ thiết bị camera.',
 '"Hệ sinh thái công nghệ tiêu dùng và giải pháp an tâm hàng đầu Việt Nam, dẫn đầu bằng AI, mở rộng bền vững ra Đông Nam Á và các thị trường quốc tế chọn lọc."',
 'Công ty gia công phần mềm xuất khẩu lớn nhất khu vực Đông Nam Á.',
 'Tập đoàn phân phối thiết bị gia dụng thông minh lớn thứ hai tại Việt Nam.',
 'B', 'Văn hóa'),

-- 27
('onboarding',
 'Sứ mệnh của Doscom được xác định nhằm mang lại giá trị gì cho khách hàng?',
 '"Sự an tâm hằng ngày trong cuộc sống, công việc và di chuyển thông qua sản phẩm công nghệ đáng tin, dịch vụ có trách nhiệm."',
 'Cam kết cung cấp các sản phẩm với mức giá rẻ nhất trên tất cả các sàn thương mại điện tử.',
 'Giải pháp tài chính ngắn hạn kết hợp đầu tư bất động sản tích hợp.',
 'Độc quyền phân phối phần cứng camera trên toàn lãnh thổ Đông Nam Á.',
 'A', 'Văn hóa'),

-- 28
('onboarding',
 'Giá trị cốt lõi số 01 ''Con người trên hết'' được Doscom xây dựng trên nền tảng cơ bản nào?',
 '"Doscom đặt sự tôn trọng, thấu hiểu và phát triển con người làm nền tảng trong mọi quyết định."',
 'Con người tại Doscom là công cụ tối ưu để tạo ra dòng tiền nhanh nhất.',
 'Chỉ tập trung tối đa quyền lợi cho ban lãnh đạo, nhân viên cấp dưới tự chịu trách nhiệm phát triển cá nhân.',
 'Luôn bỏ qua mọi quy trình kỷ luật để đảm bảo tinh thần thoải mái tối đa cho nhân viên.',
 'A', 'Văn hóa'),

-- 29
('onboarding',
 'Tư duy cốt lõi của giá trị ''Khách hàng an tâm'' (Giá trị cốt lõi số 02) được định nghĩa là gì?',
 'Khách hàng luôn đúng trong mọi hoàn cảnh, kể cả khi họ yêu cầu vi phạm pháp luật.',
 '"Không có khách hàng an tâm, Doscom không có giá trị thật."',
 'Phải chốt đơn thật nhanh trước khi khách hàng kịp thay đổi ý định.',
 'Chỉ phục vụ tận tình những khách hàng mua các sản phẩm có giá trị cao nhất.',
 'B', 'Văn hóa'),

-- 30
('onboarding',
 'Tư duy cốt lõi của giá trị ''Tốc độ có kỷ luật'' khẳng định điều gì về mối quan hệ giữa tốc độ và hệ thống?',
 'Muốn nhanh thì phải chấp nhận bỏ bớt các bước kiểm soát hệ thống.',
 '"Nhanh không phải là bỏ bước. Nhanh là có hệ thống tốt hơn."',
 'Hệ thống càng phức tạp thì tốc độ vận hành của doanh nghiệp càng cao.',
 'Kỷ luật luôn là rào cản kìm hãm tốc độ phát triển sáng tạo.',
 'B', 'Văn hóa');
