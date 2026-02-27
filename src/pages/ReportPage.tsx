import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, Download, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

interface Report {
    id: string;
    title: string;
    summary: string;
    routine_am: string[];
    routine_pm: string[];
    reasoning: string[];
    warnings: string[];
    created_at: string;
}

interface AltProduct {
    id: string;
    name: string;
    brand: string;
    image_url: string;
}

export default function ReportPage() {
    const { reportId } = useParams<{ reportId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [report, setReport] = useState<Report | null>(null);
    const [alternatives, setAlternatives] = useState<AltProduct[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!reportId || !user) return;

        const fetchReport = async () => {
            const { data } = await supabase
                .from("reports")
                .select("*")
                .eq("id", reportId)
                .eq("user_id", user.id)
                .maybeSingle();

            if (data) {
                setReport(data);

                // Fetch alternatives
                const { data: altData } = await supabase
                    .from("report_alternatives")
                    .select("product_id, products(id, name, brand, image_url)")
                    .eq("report_id", reportId)
                    .order("sort_order");

                if (altData) {
                    setAlternatives(altData.map((a: any) => a.products).filter(Boolean));
                }
            }

            setLoading(false);
        };

        fetchReport();
    }, [reportId, user]);

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

    // Not found — show demo report
    if (!report) {
        // Generate a demo report view
        const demoReport: Report = {
            id: reportId || "demo",
            title: "🌿 맞춤 스킨케어 루틴 리포트",
            summary: "피부 상태와 선호도에 맞춘 AI 맞춤 루틴입니다.",
            routine_am: [
                "클렌저 — 약산성 클렌저로 가볍게 세안",
                "토너 — 수분 토너를 화장솜에 적셔 닦아내기",
                "세럼 — 수분 세럼을 2~3방울 도포",
                "모이스처라이저 — 가벼운 수분 크림으로 마무리",
                "선스크린 — SPF50+ 자외선 차단제 필수",
            ],
            routine_pm: [
                "클렌징 오일 — 메이크업과 선크림을 먼저 제거",
                "클렌저 — 약산성 클렌저로 이중 세안",
                "토너 — 수분 토너",
                "세럼 — 비타민C 또는 나이아신아마이드 세럼",
                "나이트 크림 — 영양감 있는 크림으로 수면 중 회복",
            ],
            reasoning: [
                "수분 부족형 피부에 히알루론산 기반 제품을 우선 배치했습니다.",
                "비타민C 세럼은 PM 루틴에 배치하여 광감작 이슈를 회피합니다.",
                "세라마이드 나이트 크림으로 수면 중 피부 장벽 회복을 돕습니다.",
            ],
            warnings: [
                "비타민C와 나이아신아마이드의 동시 사용 시 자극이 있을 수 있습니다.",
                "레티놀 사용 시 선스크린 사용이 필수입니다.",
            ],
            created_at: new Date().toISOString(),
        };

        return renderReport(demoReport, []);
    }

    return renderReport(report, alternatives);

    function renderReport(r: Report, alts: AltProduct[]) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header showSearch />
                <main className="flex-1 container max-w-3xl py-6 px-4 space-y-8">
                    {/* Back */}
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" /> 뒤로
                    </button>

                    {/* Title */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                    >
                        <h1 className="text-2xl font-bold">{r.title}</h1>
                        <p className="text-sm text-muted-foreground">
                            생성일: {new Date(r.created_at).toLocaleDateString("ko-KR")}
                        </p>
                        <p className="text-muted-foreground">{r.summary}</p>
                        <div className="flex gap-2 pt-1">
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
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() => toast.info("PDF 다운로드가 준비 중입니다")}
                            >
                                <Download className="h-4 w-4 mr-1" /> PDF
                            </Button>
                        </div>
                    </motion.div>

                    {/* AM Routine */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-bold">☀️ AM 루틴</h2>
                        <div className="space-y-2">
                            {r.routine_am.map((step, i) => (
                                <div key={i} className="flex gap-3 items-start p-3 rounded-xl border border-border bg-card">
                                    <span className="text-primary font-bold text-sm mt-0.5">{i + 1}</span>
                                    <p className="text-sm">{step}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* PM Routine */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-bold">🌙 PM 루틴</h2>
                        <div className="space-y-2">
                            {r.routine_pm.map((step, i) => (
                                <div key={i} className="flex gap-3 items-start p-3 rounded-xl border border-border bg-card">
                                    <span className="text-primary font-bold text-sm mt-0.5">{i + 1}</span>
                                    <p className="text-sm">{step}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Reasoning */}
                    {r.reasoning.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-lg font-bold">🧠 조합 근거</h2>
                            <div className="gradient-glow-subtle p-4 rounded-xl space-y-2">
                                {r.reasoning.map((reason, i) => (
                                    <p key={i} className="text-sm text-foreground">• {reason}</p>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Warnings */}
                    {r.warnings.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-lg font-bold">⚠️ 주의 조합</h2>
                            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-2">
                                {r.warnings.map((warn, i) => (
                                    <p key={i} className="text-sm text-destructive">• {warn}</p>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Alternatives */}
                    {alts.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-lg font-bold">🔄 대체 제품</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {alts.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => navigate(`/p/${p.id}`)}
                                        className="rounded-xl bg-card border border-border p-3 hover:glow-shadow transition-shadow text-left"
                                    >
                                        <img
                                            src={p.image_url || "/assets/products/product-1.png"}
                                            alt={p.name}
                                            className="aspect-square w-full object-cover rounded-lg bg-muted"
                                        />
                                        <p className="text-sm font-medium mt-2 truncate">{p.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{p.brand}</p>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
                </main>
                <Footer />
            </div>
        );
    }
}
