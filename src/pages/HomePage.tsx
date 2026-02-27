import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface HomeContent {
    content_type: string;
    value: string;
    sort_order: number;
}
interface RecentSearch {
    query: string;
    created_at: string;
}

export default function HomePage() {
    const navigate = useNavigate();
    const { isLoggedIn, user } = useAuth();
    const [query, setQuery] = useState("");
    const [chips, setChips] = useState<string[]>([]);
    const [sentences, setSentences] = useState<string[]>([]);
    const [trendTags, setTrendTags] = useState<string[]>([]);
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

    useEffect(() => {
        const fetchContent = async () => {
            const { data } = await supabase
                .from("home_contents")
                .select("content_type, value, sort_order")
                .eq("is_active", true)
                .order("sort_order");

            if (data) {
                setChips(data.filter((c: HomeContent) => c.content_type === "example_chip").map((c: HomeContent) => c.value));
                setSentences(data.filter((c: HomeContent) => c.content_type === "example_sentence").map((c: HomeContent) => c.value));
                setTrendTags(data.filter((c: HomeContent) => c.content_type === "trend_tag").map((c: HomeContent) => c.value));
            }
        };
        fetchContent();
    }, []);

    useEffect(() => {
        if (!isLoggedIn || !user) return;
        const fetchRecent = async () => {
            const { data } = await supabase
                .from("search_sessions")
                .select("query, created_at")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(3);
            if (data) setRecentSearches(data);
        };
        fetchRecent();
    }, [isLoggedIn, user]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim().length >= 2) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="container max-w-3xl py-16 px-4 space-y-10 text-center"
                >
                    {/* Hero */}
                    <div className="space-y-3">
                        <h1 className="text-4xl sm:text-5xl font-bold">
                            <span className="gradient-text">K-Glow</span> AI Search
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            원하는 무드 · 피부 상태를 자연어로 입력하세요
                        </p>
                    </div>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="relative max-w-xl mx-auto">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="검색어를 입력하세요..."
                            className="w-full h-14 rounded-full border border-border bg-background pl-13 pr-14 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring glow-shadow pl-14"
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                        >
                            <ArrowRight className="h-5 w-5" />
                        </button>
                    </form>

                    {/* Example Chips */}
                    <div className="flex flex-wrap justify-center gap-2">
                        {chips.map((chip) => (
                            <motion.button
                                key={chip}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => navigate(`/search?q=${encodeURIComponent(chip)}`)}
                                className="px-4 py-2 rounded-full border border-border bg-card text-sm text-foreground hover:bg-muted transition-colors"
                            >
                                {chip}
                            </motion.button>
                        ))}
                    </div>

                    {/* Example Sentences */}
                    {sentences.length > 0 && (
                        <div className="space-y-2 text-left max-w-xl mx-auto">
                            <p className="text-sm font-medium text-muted-foreground">💬 이렇게도 검색해 보세요</p>
                            {sentences.map((sentence) => (
                                <button
                                    key={sentence}
                                    onClick={() => navigate(`/search?q=${encodeURIComponent(sentence)}`)}
                                    className="group w-full text-left p-3 rounded-xl border border-border hover:bg-muted/50 transition-all flex items-center justify-between"
                                >
                                    <span className="text-sm text-foreground group-hover:translate-x-1 transition-transform">
                                        "{sentence}"
                                    </span>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Recent Searches */}
                    {isLoggedIn && recentSearches.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="space-y-2 text-left max-w-xl mx-auto"
                        >
                            <p className="text-sm font-medium text-muted-foreground">최근 검색</p>
                            {recentSearches.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => navigate(`/search?q=${encodeURIComponent(s.query)}`)}
                                    className="w-full text-left p-3 rounded-xl border border-border hover:bg-muted/50 transition-all flex items-center justify-between"
                                >
                                    <span className="text-sm text-foreground">"{s.query}"</span>
                                    <span className="text-xs text-muted-foreground">다시 보기</span>
                                </button>
                            ))}
                        </motion.div>
                    )}

                    {/* Trend Tags */}
                    {trendTags.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-3">
                            <span className="text-sm text-muted-foreground">인기:</span>
                            {trendTags.map((tag) => (
                                <span key={tag} className="text-sm text-primary/70">{tag}</span>
                            ))}
                        </div>
                    )}
                </motion.div>
            </main>
            <Footer />
        </div>
    );
}
