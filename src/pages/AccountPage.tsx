import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Search, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

interface Preference {
    skin_type: string | null;
    tone: string | null;
    concerns: string[];
    fragrance_free: boolean;
    exclude_ingredients: string[];
    budget_band: string | null;
}
interface SearchLog {
    query: string;
    created_at: string;
    result_count: number;
}

const skinTypes = ["건성", "지성", "복합", "민감"];
const tones = ["웜", "쿨", "뉴트럴", "모름"];
const concerns = ["홍조", "트러블", "속건조", "모공", "각질", "잡티", "주름", "다크서클"];
const excludeOpts = ["향료", "에탄올", "실리콘", "파라벤"];
const budgets = ["1-3만", "3-5만", "5만+"];

const emptyPreference: Preference = {
    skin_type: null,
    tone: null,
    concerns: [],
    fragrance_free: false,
    exclude_ingredients: [],
    budget_band: null,
};

export default function AccountPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<"prefs" | "logs">("prefs");
    const [pref, setPref] = useState<Preference>(emptyPreference);
    const [searchLogs, setSearchLogs] = useState<SearchLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Load preferences
    useEffect(() => {
        if (!user) return;
        const fetchPrefs = async () => {
            const { data } = await supabase
                .from("user_preferences")
                .select("skin_type, tone, concerns, fragrance_free, exclude_ingredients, budget_band")
                .eq("user_id", user.id)
                .maybeSingle();
            if (data) setPref(data);
            setLoading(false);
        };
        fetchPrefs();
    }, [user]);

    // Load search logs when tab changes
    useEffect(() => {
        if (activeTab !== "logs" || !user) return;
        const fetchLogs = async () => {
            const { data } = await supabase
                .from("search_sessions")
                .select("query, created_at, result_count")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(30);
            if (data) setSearchLogs(data);
        };
        fetchLogs();
    }, [activeTab, user]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        await supabase
            .from("user_preferences")
            .upsert({ user_id: user.id, ...pref }, { onConflict: "user_id" });
        setSaving(false);
        toast.success("선호도가 저장되었습니다");
    };

    const handleReset = () => {
        setPref(emptyPreference);
    };

    const toggleArrayItem = (arr: string[], item: string) => {
        return arr.includes(item) ? arr.filter((a) => a !== item) : [...arr, item];
    };

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

    return (
        <div className="min-h-screen flex flex-col">
            <Header showSearch />
            <main className="flex-1 container max-w-3xl py-6 px-4 space-y-6">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold">내 계정</h1>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-border pb-[-1px]">
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${activeTab === "prefs"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        onClick={() => setActiveTab("prefs")}
                    >
                        내 조건
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${activeTab === "logs"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        onClick={() => setActiveTab("logs")}
                    >
                        검색 로그
                    </button>
                </div>

                {/* Preferences Tab */}
                {activeTab === "prefs" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        {/* Skin Type */}
                        <fieldset className="space-y-2">
                            <legend className="text-sm font-medium">피부 타입</legend>
                            <div className="flex flex-wrap gap-2">
                                {skinTypes.map(st => (
                                    <Button
                                        key={st}
                                        type="button"
                                        variant={pref.skin_type === st ? "default" : "outline"}
                                        size="sm"
                                        className="rounded-full"
                                        onClick={() => setPref({ ...pref, skin_type: pref.skin_type === st ? null : st })}
                                    >
                                        {st}
                                    </Button>
                                ))}
                            </div>
                        </fieldset>

                        {/* Tone */}
                        <fieldset className="space-y-2">
                            <legend className="text-sm font-medium">퍼스널 컬러</legend>
                            <div className="flex flex-wrap gap-2">
                                {tones.map(t => (
                                    <Button
                                        key={t}
                                        type="button"
                                        variant={pref.tone === t ? "default" : "outline"}
                                        size="sm"
                                        className="rounded-full"
                                        onClick={() => setPref({ ...pref, tone: pref.tone === t ? null : t })}
                                    >
                                        {t}
                                    </Button>
                                ))}
                            </div>
                        </fieldset>

                        {/* Concerns */}
                        <fieldset className="space-y-2">
                            <legend className="text-sm font-medium">피부 고민 (복수 선택)</legend>
                            <div className="flex flex-wrap gap-2">
                                {concerns.map(c => (
                                    <Button
                                        key={c}
                                        type="button"
                                        variant={pref.concerns.includes(c) ? "default" : "outline"}
                                        size="sm"
                                        className="rounded-full"
                                        onClick={() => setPref({ ...pref, concerns: toggleArrayItem(pref.concerns, c) })}
                                    >
                                        {c}
                                    </Button>
                                ))}
                            </div>
                        </fieldset>

                        {/* Fragrance Free */}
                        <fieldset className="space-y-2">
                            <legend className="text-sm font-medium">무향 선호</legend>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={pref.fragrance_free ? "default" : "outline"}
                                    size="sm"
                                    className="rounded-full"
                                    onClick={() => setPref({ ...pref, fragrance_free: true })}
                                >
                                    무향 선호
                                </Button>
                                <Button
                                    type="button"
                                    variant={!pref.fragrance_free ? "default" : "outline"}
                                    size="sm"
                                    className="rounded-full"
                                    onClick={() => setPref({ ...pref, fragrance_free: false })}
                                >
                                    상관없음
                                </Button>
                            </div>
                        </fieldset>

                        {/* Exclude Ingredients */}
                        <fieldset className="space-y-2">
                            <legend className="text-sm font-medium">제외 성분</legend>
                            <div className="flex flex-wrap gap-2">
                                {excludeOpts.map(e => (
                                    <Button
                                        key={e}
                                        type="button"
                                        variant={pref.exclude_ingredients.includes(e) ? "default" : "outline"}
                                        size="sm"
                                        className="rounded-full"
                                        onClick={() => setPref({ ...pref, exclude_ingredients: toggleArrayItem(pref.exclude_ingredients, e) })}
                                    >
                                        {e}
                                    </Button>
                                ))}
                            </div>
                        </fieldset>

                        {/* Budget */}
                        <fieldset className="space-y-2">
                            <legend className="text-sm font-medium">예산대</legend>
                            <div className="flex flex-wrap gap-2">
                                {budgets.map(b => (
                                    <Button
                                        key={b}
                                        type="button"
                                        variant={pref.budget_band === b ? "default" : "outline"}
                                        size="sm"
                                        className="rounded-full"
                                        onClick={() => setPref({ ...pref, budget_band: pref.budget_band === b ? null : b })}
                                    >
                                        {b}
                                    </Button>
                                ))}
                            </div>
                        </fieldset>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-4">
                            <Button onClick={handleSave} disabled={saving} className="rounded-full flex-1">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장"}
                            </Button>
                            <Button variant="outline" onClick={handleReset} className="rounded-full">
                                <RotateCcw className="w-4 h-4 mr-1" /> 초기화
                            </Button>
                        </div>
                    </motion.div>
                )}

                {/* Search Logs Tab */}
                {activeTab === "logs" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-2"
                    >
                        {searchLogs.length === 0 ? (
                            <div className="text-center py-12 space-y-3">
                                <Search className="h-10 w-10 mx-auto text-muted-foreground/30" />
                                <p className="text-muted-foreground">검색 기록이 없습니다</p>
                            </div>
                        ) : (
                            searchLogs.map((log, i) => (
                                <motion.button
                                    key={i}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    onClick={() => navigate(`/search?q=${encodeURIComponent(log.query)}`)}
                                    className="w-full text-left p-4 rounded-xl border border-border hover:bg-muted/50 transition-all flex items-center justify-between"
                                >
                                    <div>
                                        <p className="text-sm font-medium">"{log.query}"</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            결과 {log.result_count}개 · {new Date(log.created_at).toLocaleDateString("ko-KR")}
                                        </p>
                                    </div>
                                    <span className="text-xs text-primary">다시 검색</span>
                                </motion.button>
                            ))
                        )}
                    </motion.div>
                )}
            </main>
            <Footer />
        </div>
    );
}
