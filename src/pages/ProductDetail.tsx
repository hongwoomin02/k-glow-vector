import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Share2, Sparkles, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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

const categoryLabel: Record<string, string> = {
    skincare: "스킨케어",
    base: "베이스",
    lip: "립",
    eye: "아이",
    suncare: "선케어",
};

export default function ProductDetail() {
    const { productId } = useParams<{ productId: string }>();
    const navigate = useNavigate();
    const { isLoggedIn, user } = useAuth();

    const [product, setProduct] = useState<Product | null>(null);
    const [similar, setSimilar] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);
    const [showIngredients, setShowIngredients] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);

    useEffect(() => {
        if (!productId) return;
        setLoading(true);

        const fetchProduct = async () => {
            const { data } = await supabase
                .from("products")
                .select("*")
                .eq("id", productId)
                .single();

            if (data) {
                setProduct(data);

                // Fetch similar products
                const { data: simData } = await supabase
                    .from("product_similarities")
                    .select("similar_product_id")
                    .eq("product_id", productId);

                if (simData && simData.length > 0) {
                    const simIds = simData.map((s: { similar_product_id: string }) => s.similar_product_id);
                    const { data: simProducts } = await supabase
                        .from("products")
                        .select("id, name, brand, image_url")
                        .in("id", simIds);
                    if (simProducts) setSimilar(simProducts as Product[]);
                }

                // Check saved status
                if (user) {
                    const { data: savedData } = await supabase
                        .from("user_saved_products")
                        .select("id")
                        .eq("user_id", user.id)
                        .eq("product_id", productId)
                        .maybeSingle();
                    setSaved(!!savedData);
                }
            }

            setLoading(false);
        };

        fetchProduct();
    }, [productId, user]);

    const toggleSave = async () => {
        if (!isLoggedIn || !user) {
            navigate(`/auth?next=/p/${productId}&intent=save`);
            return;
        }
        if (saved) {
            await supabase.from("user_saved_products").delete().eq("user_id", user.id).eq("product_id", productId);
            setSaved(false);
        } else {
            await supabase.from("user_saved_products").insert({ user_id: user.id, product_id: productId });
            setSaved(true);
        }
    };

    // Loading
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header showSearch />
                <main className="flex-1 container max-w-4xl py-6 px-4 animate-pulse space-y-4">
                    <div className="h-64 w-full bg-muted rounded-xl" />
                    <div className="h-6 w-1/3 bg-muted rounded" />
                    <div className="h-4 w-1/4 bg-muted rounded" />
                </main>
                <Footer />
            </div>
        );
    }

    // Not found
    if (!product) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header showSearch />
                <main className="flex-1 container py-16 text-center space-y-4">
                    <p className="text-muted-foreground">제품을 찾을 수 없습니다.</p>
                    <Button variant="outline" onClick={() => navigate("/")}>홈으로</Button>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header showSearch />
            <main className="flex-1 container max-w-4xl py-6 px-4 space-y-8">
                {/* Back */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" /> 뒤로
                </button>

                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col md:flex-row gap-6"
                >
                    <img
                        src={product.image_url || "/assets/products/product-1.png"}
                        alt={product.name}
                        className="w-full md:w-80 h-80 object-cover rounded-2xl bg-muted"
                    />
                    <div className="space-y-3 flex-1">
                        <p className="text-sm text-muted-foreground">{product.brand}</p>
                        <h1 className="text-2xl font-bold">{product.name}</h1>
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs px-2.5 py-1 rounded-full bg-card border border-border">
                                {categoryLabel[product.category] || product.category}
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-full bg-card border border-border">
                                {product.finish}
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-full bg-card border border-border">
                                {product.tone_fit}
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-full bg-card border border-border">
                                {product.price_band}
                            </span>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button
                                variant={saved ? "default" : "outline"}
                                size="sm"
                                className="rounded-full"
                                onClick={toggleSave}
                            >
                                <Heart className={`h-4 w-4 mr-1 ${saved ? "fill-current" : ""}`} />
                                {saved ? "저장됨" : "저장"}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    toast.success("링크가 복사되었습니다");
                                }}
                            >
                                <Share2 className="h-4 w-4 mr-1" /> 공유
                            </Button>
                        </div>
                    </div>
                </motion.div>

                {/* Recommendation Reason */}
                <section className="space-y-3">
                    <h2 className="text-lg font-bold">추천 근거</h2>
                    <div className="gradient-glow-subtle p-4 rounded-xl">
                        <p className="text-sm text-foreground">{product.explain_short}</p>
                    </div>
                </section>

                {/* Ingredients */}
                <section className="space-y-3">
                    <h2 className="text-lg font-bold">성분 요약</h2>
                    <p className="text-sm">
                        <span className="text-muted-foreground">핵심 성분: </span>
                        {product.ingredients_top.join(", ")}
                    </p>
                    {product.ingredients_caution.length > 0 && (
                        <p className="text-sm">
                            <span className="text-destructive">주의 성분: </span>
                            {product.ingredients_caution.join(", ")}
                        </p>
                    )}
                    <button
                        onClick={() => setShowIngredients(!showIngredients)}
                        className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                    >
                        전체 성분 보기
                        <ChevronDown className={`h-4 w-4 transition-transform ${showIngredients ? "rotate-180" : ""}`} />
                    </button>
                    {showIngredients && (
                        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                            {[...product.ingredients_top, ...product.ingredients_caution].join(", ")}
                        </div>
                    )}
                </section>

                {/* Texture */}
                <section className="space-y-3">
                    <h2 className="text-lg font-bold">사용감 / 제형</h2>
                    <div className="flex flex-wrap gap-2">
                        {product.tags.slice(0, 4).map(tag => (
                            <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-card border border-border">{tag}</span>
                        ))}
                    </div>
                    {product.texture_desc && (
                        <p className="text-sm text-muted-foreground">{product.texture_desc}</p>
                    )}
                </section>

                {/* Similar Products */}
                {similar.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-lg font-bold">유사 제품</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {similar.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => navigate(`/p/${s.id}`)}
                                    className="rounded-xl bg-card border border-border p-3 hover:glow-shadow transition-shadow text-left"
                                >
                                    <img
                                        src={s.image_url || "/assets/products/product-1.png"}
                                        alt={s.name}
                                        className="aspect-square w-full object-cover rounded-lg bg-muted"
                                        loading="lazy"
                                    />
                                    <p className="text-sm font-medium mt-2 truncate">{s.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{s.brand}</p>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* Routine Report CTA */}
                <div className="rounded-2xl gradient-glow p-6 text-center space-y-3">
                    <Sparkles className="h-8 w-8 mx-auto text-white" />
                    <p className="text-lg font-bold text-white">이 제품 포함 루틴 리포트 만들기</p>
                    <p className="text-sm text-white/80">
                        AI가 AM/PM 루틴, 주의 조합, 대체 제품을 분석합니다
                    </p>
                    <Button
                        variant="secondary"
                        className="rounded-full"
                        onClick={() => {
                            if (!isLoggedIn) navigate(`/auth?next=/p/${productId}&intent=buy_report`);
                            else setPaymentOpen(true);
                        }}
                    >
                        리포트 만들기 — ₩4,900
                    </Button>
                </div>

                {/* Payment Modal */}
                <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                    <DialogContent className="max-w-sm text-center space-y-4 p-8">
                        <DialogTitle>루틴 리포트</DialogTitle>
                        <p className="text-4xl">✨</p>
                        <p className="text-lg font-bold">프리미엄 루틴 리포트</p>
                        <p className="text-2xl font-bold text-primary">₩4,900</p>
                        <Button
                            className="w-full rounded-xl"
                            onClick={async () => {
                                if (user) {
                                    await supabase.from("orders").insert({
                                        user_id: user.id,
                                        amount: 4900,
                                        product_type: "routine_report",
                                        status: "paid",
                                    });
                                }
                                setPaymentOpen(false);
                                navigate(`/report/report-${Date.now()}`);
                            }}
                        >
                            결제 완료
                        </Button>
                        <Button variant="outline" className="w-full rounded-xl" onClick={() => setPaymentOpen(false)}>
                            닫기
                        </Button>
                    </DialogContent>
                </Dialog>
            </main>
            <Footer />
        </div>
    );
}
