import * as React from "react";
import { ArrowRight, ChevronLeft, Tag, Zap } from "lucide-react";
import { Product } from "../../types";
import { Card, Badge, Button, cn } from "../ui";

// ─── Product List ─────────────────────────────────────────────────────────────

interface ProductLibraryProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

const ProductLibrary = ({ products, onSelectProduct }: ProductLibraryProps) => {
  const [activeCategory, setActiveCategory] = React.useState<string>("Tất cả");

  const categories = [
    "Tất cả",
    ...Array.from(new Set(products.map((p) => p.category))),
  ];

  const filtered =
    activeCategory === "Tất cả"
      ? products
      : products.filter((p) => p.category === activeCategory);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-3">
          <h1 className="text-5xl font-black tracking-tight text-white italic uppercase leading-none">
            KHO SẢN PHẨM
          </h1>
          <p className="text-emerald-500 font-black font-mono text-[10px] tracking-[0.3em] uppercase italic bg-emerald-500/5 inline-block px-4 py-1.5 rounded-full ring-1 ring-emerald-500/20">
            Thư viện sản phẩm Doscom & Noma
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 bg-zinc-900/40 p-1.5 rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-md flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest italic",
                activeCategory === cat
                  ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20"
                  : "text-zinc-600 hover:text-zinc-300"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid — 4 columns on xl */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((product) => (
          <Card
            key={product.id}
            className="group flex flex-col h-full bg-[#0C0C0E] border-zinc-900 hover:border-emerald-500/30 transition-all duration-700 rounded-[2rem] overflow-hidden shadow-2xl relative cursor-pointer"
            onClick={() => onSelectProduct(product)}
          >
            <div className="relative aspect-[16/9] overflow-hidden">
              <img
                src={product.thumbnail}
                alt={product.title}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-60 group-hover:opacity-100"
              />
              <div className="absolute top-4 left-4">
                <Badge
                  variant="default"
                  className="bg-black/80 backdrop-blur-xl text-white border-zinc-800/80 px-3 py-1 font-black uppercase text-[8px] tracking-widest leading-none"
                >
                  {product.brand}
                </Badge>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0E] via-transparent to-transparent opacity-90" />
            </div>

            <div className="p-5 flex flex-col flex-1 space-y-4">
              <div className="space-y-1.5">
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] italic">
                  {product.category}
                </span>
                {product.code && (
                  <span className="ml-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest italic">
                    #{product.code}
                  </span>
                )}
                <h3 className="font-extrabold text-lg text-zinc-100 leading-tight group-hover:text-emerald-400 transition-colors uppercase italic tracking-tighter line-clamp-2">
                  {product.title}
                </h3>
                <p className="text-zinc-600 text-[11px] leading-relaxed line-clamp-2">
                  {product.shortDescription}
                </p>
              </div>

              <div className="mt-auto pt-4 border-t border-zinc-900/50">
                <Button
                  variant="outline"
                  className="w-full text-[10px] font-black h-10 uppercase tracking-widest rounded-xl group/btn italic border-zinc-800 text-emerald-500 hover:bg-emerald-500 hover:text-white"
                >
                  Xem chi tiết
                  <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ─── Product Detail ───────────────────────────────────────────────────────────

interface ProductDetailProps {
  product: Product;
  onBack: () => void;
}

const ProductDetail = ({ product, onBack }: ProductDetailProps) => {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-700 pb-20">
      <header className="flex flex-col gap-8">
        <button
          onClick={onBack}
          className="text-zinc-600 hover:text-white group flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.3em] transition-all italic underline underline-offset-8 decoration-zinc-800"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          QUAY LẠI KHO SẢN PHẨM
        </button>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 border-b border-zinc-900 pb-12">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Badge
                variant="success"
                className="px-6 py-2 bg-emerald-500/10 text-emerald-500 border-none font-black italic tracking-widest uppercase"
              >
                {product.brand}
              </Badge>
              <Badge className="px-6 py-2 bg-zinc-800 text-zinc-500 border-none font-black tracking-widest uppercase">
                {product.category}
              </Badge>
              {product.code && (
                <Badge className="px-6 py-2 bg-zinc-900 text-zinc-600 border-none font-black tracking-widest uppercase">
                  #{product.code}
                </Badge>
              )}
            </div>
            <h1 className="text-6xl font-black tracking-tighter text-white italic uppercase leading-tight">
              {product.title}
            </h1>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xl">
              {product.shortDescription}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Thumbnail */}
        <div className="aspect-video rounded-[2.5rem] overflow-hidden border-2 border-zinc-900 shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
          <img
            src={product.thumbnail}
            alt={product.title}
            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-700"
          />
        </div>

        {/* Features */}
        <Card className="p-12 bg-zinc-900/50 border-zinc-800 rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.4)] space-y-10 relative overflow-hidden group border-dashed hover:border-emerald-500/30 transition-all">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full -mr-24 -mt-24 pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-700" />

          <div className="flex items-center gap-3 relative z-10">
            <Zap className="w-5 h-5 text-emerald-500" />
            <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.4em] italic font-mono">
              TÍNH NĂNG NỔI BẬT
            </span>
          </div>

          <ul className="space-y-5 relative z-10">
            {product.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Tag className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-zinc-300 font-bold text-sm leading-relaxed">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────

interface ProductModuleProps {
  mode: "list" | "detail";
  products?: Product[];
  product?: Product;
  onSelectProduct?: (product: Product) => void;
  onBack?: () => void;
}

export default function ProductModule({
  mode,
  products = [],
  product,
  onSelectProduct,
  onBack,
}: ProductModuleProps) {
  if (mode === "detail" && product) {
    return <ProductDetail product={product} onBack={onBack || (() => {})} />;
  }
  return (
    <ProductLibrary
      products={products}
      onSelectProduct={onSelectProduct || (() => {})}
    />
  );
}