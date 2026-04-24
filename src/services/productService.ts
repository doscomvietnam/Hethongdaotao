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