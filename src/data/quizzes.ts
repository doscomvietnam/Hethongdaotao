import { Quiz } from "../types";

export const QUIZZES: Quiz[] = [
    {
        id: 'q-da-01',
        courseId: 'c-da-01',
        title: 'Kiểm tra năng lực Camera AI DA-01',
        maxAttempts: 3,
        passScore: 80,
        questions: [
            { id: '1', question: 'Camera DA-01 hỗ trợ độ phân giải tối đa là?', options: ['720p', '1080p', '2K Ultra HD', '4K'], correctAnswer: 2 },
            { id: '2', question: 'Tầm xa hồng ngoại ban đêm của DA-01 là bao nhiêu?', options: ['10m', '20m', '30m', '50m'], correctAnswer: 2 },
            { id: '3', question: 'Thiết bị nhận diện khuôn mặt dựa trên công nghệ nào?', options: ['Cảm biến nhiệt', 'Chip AI xử lý hình ảnh', 'Cảm biến hồng ngoại', 'Radar'], correctAnswer: 1 },
            { id: '4', question: 'DA-01 có hỗ trợ đàm thoại 2 chiều không?', options: ['Có', 'Không', 'Chỉ nghe', 'Chỉ nói'], correctAnswer: 0 },
            { id: '5', question: 'Chuẩn chống nước của thiết bị là gì?', options: ['IP65', 'IP66', 'IP67', 'IP68'], correctAnswer: 2 },
            { id: '6', question: 'Để lưu trữ video lâu dài, DA-01 hỗ trợ phương thức nào?', options: ['Thẻ nhớ MicroSD', 'Lưu trữ Cloud', 'Cả A và B', 'USB'], correctAnswer: 2 },
            { id: '7', question: 'Cảnh báo đột nhập sẽ được gửi đến đâu?', options: ['Email', 'App Doscom Cloud', 'Sổ tay kỹ thuật', 'Tin nhắn SMS'], correctAnswer: 1 },
            { id: '8', question: 'Số lượng người dùng tối đa có thể cùng xem camera là?', options: ['1 người', '2 người', 'Không giới hạn (chia sẻ qua app)', '5 người'], correctAnswer: 2 },
            { id: '9', question: 'Bộ sản phẩm DA-01 chuẩn bao gồm những gì?', options: ['Chỉ camera', 'Camera và nguồn', 'Camera, nguồn, chân đế, ốc vít', 'Camera và thẻ nhớ'], correctAnswer: 2 },
            { id: '10', question: 'Ứng dụng quản lý camera của Doscom có tên là gì?', options: ['Doscom Home', 'Doscom Cloud', 'Smart Life', 'Tuya Smart'], correctAnswer: 1 }
        ]
    }
];