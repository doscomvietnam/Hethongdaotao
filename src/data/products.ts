import { Product } from "../types";

export const PRODUCTS: Product[] = [
    {
        id: 'p-da-01',
        code: 'DA-01',
        title: 'Camera An Ninh AI Doscom DA-01',
        brand: 'Doscom',
        category: 'Camera An Ninh',
        thumbnail: 'https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?auto=format&fit=crop&q=80&w=800',
        shortDescription: 'Dòng camera thông minh tích hợp chip xử lý AI nhận diện khuôn mặt và cảnh báo đột nhập thời gian thực.',
        features: [
            'Nhận diện khuôn mặt AI chính xác 99%',
            'Cảnh báo đột nhập qua điện thoại',
            'Đàm thoại 2 chiều chất lượng cao',
            'Hồng ngoại ban đêm 30m',
            'Chuẩn chống nước IP67'
        ]
    },
    {
        id: 'p-g10',
        code: 'G10',
        title: 'Thiết Bị Định Vị GPS Siêu Nhỏ G10',
        brand: 'Doscom',
        category: 'Định Vị GPS',
        thumbnail: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&q=80&w=800',
        shortDescription: 'Thiết bị định vị chính xác sai số dưới 5m, thời lượng pin chờ lên tới 15 ngày, dễ dàng dấu kín.',
        features: [
            'Định vị thời gian thực chính xác',
            'Xem lại lịch sử di chuyển 90 ngày',
            'Cảnh báo ra khỏi vùng an toàn',
            'Nam châm siêu dính',
            'Kích thước siêu nhỏ 3cm'
        ]
    },
    {
        id: 'p-nm-911',
        code: 'Noma 911',
        title: 'Hệ Thống Báo Động Noma 911',
        brand: 'Noma',
        category: 'Hệ Thống Báo Động',
        thumbnail: 'https://images.unsplash.com/photo-1558002038-103792e097df?auto=format&fit=crop&q=80&w=800',
        shortDescription: 'Giải pháp an ninh toàn diện cho biệt thự, hỗ trợ kết nối 100 thiết bị ngoại vi qua WiFi và SIM 4G.',
        features: [
            'Hỗ trợ WiFi & SIM 4G/LTE',
            'Kết nối 100 cảm biến không dây',
            'Còi hú âm lượng 110dB',
            'Pin dự phòng 8 tiếng',
            'Điều khiển qua App mobile'
        ]
    }
];