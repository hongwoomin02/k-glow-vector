import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
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
    explain_short: string;
    image_url: string;
    similarity?: number;
}

interface SearchMeta {
    model: string;
    embedding_dim: number;
    match_threshold: number;
    candidates_found: number;
    results_after_filter: number;
    top_similarity: number;
    avg_similarity: number;
    top_brands: string[];
    top_tags: string[];
    category_distribution: Record<string, number>;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SEARCH_TIMEOUT_MS = 15000;

async function searchProductsAI(q: string, filters?: Record<string, string>) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
    try {
        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/ai-search`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${ANON_KEY}`,
                    apikey: ANON_KEY,
                },
                body: JSON.stringify({ query: q, filters }),
                signal: controller.signal,
            }
        );
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`${response.status}`);
        return await response.json();
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

const categoryLabels: Record<string, string> = {
    skincare: "스킨케어",
    base: "베이스",
    lip: "립",
    eye: "아이",
    suncare: "선케어",
};

export default function SearchPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { isLoggedIn, user } = useAuth();
    const q = searchParams.get("q") ?? "";

    const [results, setResults] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingStep, setLoadingStep] = useState(0);
    const [activeCategory, setActiveCategory] = useState("all");
    const [visibleCount, setVisibleCount] = useState(10);
    const [savedIds, setSavedIds] = useState<string[]>([]);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [intentSummary, setIntentSummary] = useState<string | null>(null);
    const [searchMeta, setSearchMeta] = useState<SearchMeta | null>(null);
    const [searchMode, setSearchMode] = useState<"ai" | "keyword">("ai");

    useEffect(() => {
        if (!q) {
            navigate("/", { replace: true });
            return;
        }

        setLoading(true);
        setLoadingStep(0);
        setActiveCategory("all");
        setVisibleCount(10);

        const timer1 = setTimeout(() => setLoadingStep(1), 500);
        const timer2 = setTimeout(() => setLoadingStep(2), 1000);

        const fetchKeywordResults = async () => {
            const searchTerms = q.split(/\s+/).filter(Boolean);
            let query = supabase.from("products").select("*");
            const orConditions = searchTerms.map(term => {
                const like = `%${term}%`;
                return `name.ilike.${like},brand.ilike.${like},category.ilike.${like},explain_short.ilike.${like},tags.cs.{${term}}`;
            }).join(",");
            if (orConditions) {
                query = query.or(orConditions);
            }
            const { data } = await query;
            return data || [];
        };

        const fetchResults = async () => {
            let finalResults: Product[] = [];

            // Try AI semantic search first
            try {
                const aiResult = await searchProductsAI(q);
                if (aiResult.results?.length > 0) {
                    finalResults = aiResult.results;
                    setIntentSummary(aiResult.intent_summary);
                    setSearchMeta(aiResult.search_meta);
                    setSearchMode("ai");
                } else {
                    throw new Error("No AI results");
                }
            } catch (err) {
                console.warn("AI search failed, falling back to keyword:", err);
                finalResults = await fetchKeywordResults();
                setIntentSummary(null);
                setSearchMeta(null);
                setSearchMode("keyword");
            }

            setResults(finalResults);

            // Record search session
            if (user) {
                await supabase.from("search_sessions").insert({
                    user_id: user.id,
                    query: q,
                    result_count: finalResults.length,
                });
            }

            // Load saved product IDs
            if (user) {
                const { data: savedData } = await supabase
                    .from("user_saved_products")
                    .select("product_id")
                    .eq("user_id", user.id);
                if (savedData) setSavedIds(savedData.map((s: { product_id: string }) => s.product_id));
            }

            setTimeout(() => setLoading(false), 1500);
        };

        fetchResults();
        return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }, [q, navigate, user]);

    const filteredResults = activeCategory === "all"
        ? results
        : results.filter(p => p.category === activeCategory);
    const visibleResults = filteredResults.slice(0, visibleCount);

    const categories = ["all", ...new Set(results.map(p => p.category))];

    const topBrands = [...new Set(results.map(p => p.brand))].slice(0, 3);
    const topTags = [...new Set(results.flatMap(p => p.tags))].slice(0, 5);

    const toggleSave = async (productId: string) => {
        if (!isLoggedIn || !user) {
            navigate(`/auth?next=/search?q=${encodeURIComponent(q)}&intent=save`);
            return;
        }
        if (savedIds.includes(productId)) {
            await supabase.from("user_saved_products").delete().eq("user_id", user.id).eq("product_id", productId);
            setSavedIds(prev => prev.filter(id => id !== productId));
        } else {
            await supabase.from("user_saved_products").insert({ user_id: user.id, product_id: productId });
            setSavedIds(prev => [...prev, productId]);
        }
    };

    // Loading UI
    if (loading) {
        const steps = ["AI 쿼리 분석 중...", "시맨틱 검색 중...", "결과 정리 중..."];
        return (
            <div className="min-h-screen flex flex-col">
                <Header showSearch />
                <main className="flex-1 container max-w-3xl py-12 px-4">
                    <div className="space-y-4 max-w-md mx-auto">
                        <p className="text-sm text-muted-foreground font-medium">AI가 제품을 분석하는 중...</p>
                        {steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                {i < loadingStep ? (
                                    <span className="text-primary">✓</span>
                                ) : i === loadingStep ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                    <span className="h-4 w-4" />
                                )}
                                <span className={i <= loadingStep ? "text-foreground" : "text-muted-foreground/50"}>
                                    {step}
                                </span>
                            </div>
                        ))}
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${((loadingStep + 1) / steps.length) * 100}%` }}
                            />
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    // Empty state
    if (filteredResults.length === 0) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header showSearch />
                <main className="flex-1 container py-16 text-center space-y-4">
                    <p className="text-lg text-muted-foreground">결과가 없습니다 😢</p>
                    {activeCategory !== "all" && (
                        <Button variant="outline" onClick={() => { setActiveCategory("all"); setVisibleCount(10); }}>
                            필터 초기화
                        </Button>
                    )}
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header showSearch />
            <main className="flex-1 container max-w-3xl py-6 px-4 space-y-4">
                {/* Search Insight */}
                <div className="gradient-glow-subtle p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Sparkles className="h-4 w-4 text-primary" />
                        {searchMode === "ai" ? "AI 시맨틱 검색" : "키워드 검색"}
                        {searchMeta && (
                            <span className="text-xs text-muted-foreground font-normal ml-auto">
                                유사도 상위 {searchMeta.top_similarity} · 평균 {searchMeta.avg_similarity}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {intentSummary || `"${q}"에 대해 ${results.length}개 제품을 찾았습니다.`}
                    </p>
                    {(searchMeta?.top_brands || topBrands).length > 0 && (
                        <p className="text-xs text-muted-foreground">
                            상위 브랜드: {(searchMeta?.top_brands || topBrands).join(", ")}
                        </p>
                    )}
                    {(searchMeta?.top_tags || topTags).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {(searchMeta?.top_tags || topTags).map(tag => (
                                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                        <Button
                            key={cat}
                            variant={activeCategory === cat ? "default" : "outline"}
                            size="sm"
                            className="rounded-full"
                            onClick={() => { setActiveCategory(cat); setVisibleCount(10); }}
                        >
                            {cat === "all" ? "전체" : categoryLabels[cat] || cat}
                        </Button>
                    ))}
                </div>

                {/* Result Count */}
                <p className="text-sm text-muted-foreground">
                    "{q}" 검색 결과 {filteredResults.length}개
                </p>

                {/* Product Cards */}
                <div className="space-y-3">
                    {visibleResults.map((product, i) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <ProductCard
                                product={product}
                                saved={savedIds.includes(product.id)}
                                onSaveToggle={() => toggleSave(product.id)}
                                onClick={() => navigate(`/p/${product.id}`)}
                            />
                        </motion.div>
                    ))}
                </div>

                {/* Load More */}
                {visibleCount < filteredResults.length && (
                    <div className="text-center">
                        <Button variant="outline" onClick={() => setVisibleCount(prev => prev + 10)}>
                            더 보기
                        </Button>
                    </div>
                )}

                {/* Premium CTA */}
                <div className="rounded-2xl gradient-glow p-6 text-center space-y-3 mt-8">
                    <Sparkles className="h-8 w-8 mx-auto text-white" />
                    <p className="text-lg font-bold text-white">프리미엄 루틴 리포트 만들기</p>
                    <p className="text-sm text-white/80">
                        AI가 AM/PM 루틴, 주의 조합, 대체 제품을 분석합니다
                    </p>
                    <Button
                        variant="secondary"
                        className="rounded-full"
                        onClick={() => {
                            if (!isLoggedIn) {
                                navigate(`/auth?next=/search?q=${encodeURIComponent(q)}&intent=buy_report`);
                            } else {
                                setPaymentOpen(true);
                            }
                        }}
                    >
                        ✨ 프리미엄 루틴 리포트 만들기 — ₩4,900
                    </Button>
                </div>

                {/* Payment Modal */}
                <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                    <DialogContent className="max-w-sm text-center space-y-4 p-8">
                        <DialogTitle>루틴 리포트</DialogTitle>
                        <p className="text-4xl">✨</p>
                        <p className="text-lg font-bold">프리미엄 루틴 리포트</p>
                        <p className="text-2xl font-bold text-primary">₩4,900</p>
                        <p className="text-sm text-muted-foreground">
                            AI가 AM/PM 루틴, 성분 시너지, 주의 조합, 대체 제품을 분석합니다.
                        </p>
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
