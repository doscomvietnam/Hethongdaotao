import { Course } from "../types";

export const COURSES: Course[] = [
    {
        id: 'c-overview',
        title: 'Tổng Quan Về Công Ty',
        brand: 'Tổng Quan Về Công Ty',
        category: 'Đào Tạo',
        thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        progress: 0,
        isCompleted: false,
        attempts: 0
    },
    {
        id: 'c-onboarding',
        title: 'Đào Tạo Onboarding',
        brand: 'Đào Tạo Onboarding',
        category: 'Đào Tạo',
        thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        progress: 0,
        isCompleted: false,
        attempts: 0
    },
    {
        id: 'c-regulations',
        title: 'Nội Quy - Quy Chế',
        brand: 'Nội Quy - Quy Chế',
        category: 'Đào Tạo',
        thumbnail: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=800',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        progress: 0,
        isCompleted: false,
        attempts: 0
    },
    {
        id: 'c-culture',
        title: 'Văn Hóa Công Ty',
        brand: 'Văn Hóa Công Ty',
        category: 'Đào Tạo',
        thumbnail: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=800',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        progress: 0,
        isCompleted: false,
        attempts: 0
    },
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
];