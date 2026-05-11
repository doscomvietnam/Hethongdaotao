import type { Product, Brand } from "../types";
import { supabase } from "./supabaseClient";
import { convertGoogleDriveToDirectUrl } from "./mediaHelpers";

function normalizeBrand(value: string): Brand {
    if (value === "Doscom" || value === "Noma" || value === "Nội bộ") {
        return value;
    }
    return "Doscom";
}

/**
 * Map dữ liệu từ Supabase row sang Product interface
 * Columns: product_id, product_code, product_name, brand, category,
 *          short_description, feature_1..4, thumbnail_url, status
 */
function mapProductRow(item: any): Product {
    return {
        id: item.product_id || "",
        code: item.product_code || "",
        title: item.product_name || "",
        brand: normalizeBrand(item.brand || ""),
        category: item.category || "",
        thumbnail: convertGoogleDriveToDirectUrl(item.thumbnail_url || ""),
        shortDescription: item.short_description || "",
        features: [
            item.feature_1,
            item.feature_2,
            item.feature_3,
            item.feature_4,
        ].filter(Boolean),
    };
}

export async function getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active");

    if (error) {
        console.error("Lỗi tải products:", error);
        throw error;
    }

    if (!Array.isArray(data)) {
        return [];
    }

    return data.map(mapProductRow);
}

export async function getProductById(id: string): Promise<Product | null> {
    const products = await getProducts();
    return products.find((item) => item.id === id) ?? null;
}

// ── Admin CRUD ──────────────────────────────────────────────────────────
export async function getAllProductsRaw(): Promise<any[]> {
    const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("product_id", { ascending: true });
    if (error) { console.error("Lỗi tải products (admin):", error); throw error; }
    return Array.isArray(data) ? data : [];
}

export interface ProductInput {
    product_id: string;
    product_code?: string;
    product_name: string;
    brand: string;
    category: string;
    short_description?: string;
    feature_1?: string;
    feature_2?: string;
    feature_3?: string;
    feature_4?: string;
    thumbnail_url?: string;
    status?: string;
}

export async function createProduct(input: ProductInput): Promise<void> {
    const payload = { ...input, status: input.status || "active" };
    const { data, error } = await supabase.from("products").insert(payload).select();
    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error('Không tạo được sản phẩm — kiểm tra RLS policy INSERT cho bảng products.');
    }
}

export async function updateProduct(productId: string, input: Partial<ProductInput>): Promise<void> {
    const { product_id: _ignore, ...rest } = input as any;
    const { data, error } = await supabase
        .from("products")
        .update(rest)
        .eq("product_id", productId)
        .select();
    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error('Không có sản phẩm nào được cập nhật — kiểm tra RLS policy UPDATE cho bảng products.');
    }
}

export async function deleteProduct(productId: string): Promise<void> {
    const { data, error } = await supabase
        .from("products")
        .delete()
        .eq("product_id", productId)
        .select();
    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error('Không xoá được — kiểm tra RLS policy DELETE cho bảng products.');
    }
}