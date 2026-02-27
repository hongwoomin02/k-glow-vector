import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Heart, GitCompare, X, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";

interface Product {
    id: string;
    name: string;
    brand: string;
    category: string;
    price_band: string;
    finish: string;
    tone_fit: string;
    tags: string[];
    ingredients_top: string[];
    ingredients_caution: string[];
    texture_desc: string;
    explain_short: string;
    image_url: string;
}

export default function SavedPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [compareMode, setCompareMode] = useState(false);
    const [compareIds, setCompareIds] = useState<string[]>([]);
    const [compareOpen, setCompareOpen] = useState(false);

    useEffect(() => {
        if (!user) return;
        const fetchSaved = async () => {
            const { data } = await supabase
                .from("user_saved_products")
                .select("product_id, products(*)")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (data) {
                const mapped = data
                    .map((d: any) => d.products)
                    .filter(Boolean);
                setProducts(mapped);
            }
            setLoading(false);
        };
        fetchSaved();
    }, [user]);

    const handleUnsave = async (productId: string) => {
        if (!user) return;
        await supabase
            .from("user_saved_products")
            .delete()
            .eq("user_id", user.id)
            .eq("product_id", productId);
        setProducts(prev => prev.filter(p => p.id !== productId));
        setCompareIds(prev => prev.filter(id => id !== productId));
    };

    const toggleCompare = (id: string) => {
        if (compareIds.includes(id)) {
            setCompareIds(prev => prev.filter(cid => cid !== id));
        } else if (compareIds.length < 3) {
            setCompareIds(prev => [...prev, id]);
        }
    };

    const compareProducts = products.filter(p => compareIds.includes(p.id));

    // Loading
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header showSearch />
                <main className="flex-1 container py-12 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </main>
                <Footer />
            </div>
        );
    }

    // Empty
    if (products.length === 0) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header showSearch />
                <main className="flex-1 container py-16 text-center space-y-4">
                    <Heart className="h-12 w-12 mx-auto text-muted-foreground/30" />
                    <p className="text-lg text-muted-foreground">저장된 제품이 없습니다</p>
                    <p className="text-sm text-muted-foreground">
                        검색 결과에서 ♡ 버튼을 눌러 제품을 저장해 보세요
                    </p>
                    <Button variant="outline" onClick={() => navigate("/")}>
                        검색하러 가기
                    </Button>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header showSearch />
            <main className="flex-1 container max-w-3xl py-6 px-4 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-bold">저장된 제품 ({products.length})</h1>
                    </div>
                    <Button
                        variant={compareMode ? "default" : "outline"}
                        size="sm"
                        className="rounded-full"
                        onClick={() => {
                            setCompareMode(!compareMode);
                            if (compareMode) setCompareIds([]);
                        }}
                    >
                        <GitCompare className="h-4 w-4 mr-1" />
                        {compareMode ? "비교 취소" : "비교하기"}
                    </Button>
                </div>

                {/* Compare bar */}
                {compareMode && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                        <p className="text-sm text-muted-foreground">
                            {compareIds.length}/3개 선택됨
                        </p>
                        <Button
                            size="sm"
                            className="rounded-full"
                            disabled={compareIds.length < 2}
                            onClick={() => setCompareOpen(true)}
                        >
                            비교하기
                        </Button>
                    </div>
                )}

                {/* Product List */}
                <div className="space-y-3">
                    {products.map((product, i) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="relative"
                        >
                            {compareMode && (
                                <div className="absolute top-2 left-2 z-10">
                                    <button
                                        onClick={() => toggleCompare(product.id)}
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs transition-colors ${compareIds.includes(product.id)
                                                ? "bg-primary border-primary text-primary-foreground"
                                                : "bg-background border-border text-muted-foreground"
                                            }`}
                                    >
                                        {compareIds.includes(product.id) ? "✓" : ""}
                                    </button>
                                </div>
                            )}
                            <ProductCard
                                product={product}
                                saved
                                onSaveToggle={() => handleUnsave(product.id)}
                                onClick={() => !compareMode && navigate(`/p/${product.id}`)}
                            />
                        </motion.div>
                    ))}
                </div>

                {/* Compare Modal */}
                <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto p-6">
                        <DialogTitle className="flex items-center justify-between">
                            <span>제품 비교</span>
                            <button onClick={() => setCompareOpen(false)}>
                                <X className="h-4 w-4" />
                            </button>
                        </DialogTitle>
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left p-2 text-muted-foreground font-normal w-24">항목</th>
                                        {compareProducts.map(p => (
                                            <th key={p.id} className="p-2 text-left font-bold">{p.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { label: "이미지", render: (p: Product) => <img src={p.image_url || "/assets/products/product-1.png"} className="w-16 h-16 rounded-lg object-cover" alt="" /> },
                                        { label: "브랜드", render: (p: Product) => p.brand },
                                        { label: "가격대", render: (p: Product) => p.price_band },
                                        { label: "카테고리", render: (p: Product) => p.category },
                                        { label: "피니시", render: (p: Product) => p.finish },
                                        { label: "톤핏", render: (p: Product) => p.tone_fit },
                                        { label: "핵심 성분", render: (p: Product) => p.ingredients_top.join(", ") },
                                        { label: "주의 성분", render: (p: Product) => p.ingredients_caution.length > 0 ? p.ingredients_caution.join(", ") : "—" },
                                        { label: "추천 요약", render: (p: Product) => p.explain_short },
                                    ].map(row => (
                                        <tr key={row.label} className="border-b border-border/50">
                                            <td className="p-2 text-muted-foreground">{row.label}</td>
                                            {compareProducts.map(p => (
                                                <td key={p.id} className="p-2">{row.render(p)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </DialogContent>
                </Dialog>
            </main>
            <Footer />
        </div>
    );
}
