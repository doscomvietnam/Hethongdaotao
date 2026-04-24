import { Course } from "../types";

export const COURSES: Course[] = [
    {
        id: 'c-da-01',
        productId: 'p-da-01',
        title: 'Đào Tạo Kỹ Thuật Camera AI DA-01',
        brand: 'Doscom',
        category: 'Sản Phẩm',
        thumbnail: 'https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?auto=format&fit=crop&q=80&w=800',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        progress: 0,
        isCompleted: false,
        quizId: 'q-da-01',
        attempts: 0
    },
    {
        id: 'c-g10',
        productId: 'p-g10',
        title: 'Hướng Dẫn Vận Hành Định Vị G10',
        brand: 'Doscom',
        category: 'Sản Phẩm',
        thumbnail: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&q=80&w=800',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        progress: 45,
        isCompleted: false,
        quizId: 'q-g10',
        attempts: 1,
        lastQuizScore: 60
    },
    {
        id: 'c-warranty',
        title: 'Quy Trình Xử Lý Bảo Hành 2024',
        brand: 'Nội bộ',
        category: 'Quy Trình',
        thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        progress: 100,
        isCompleted: true,
        quizId: 'q-warranty',
        attempts: 1,
        lastQuizScore: 90
    }
];