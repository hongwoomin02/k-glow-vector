import { Link, useNavigate } from "react-router-dom";
import { Moon, Sun, Heart, User, LogOut, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function Header({ showSearch = false }: { showSearch?: boolean }) {
    const { isLoggedIn, logout } = useAuth();
    const navigate = useNavigate();
    const [isDark, setIsDark] = useState(false);
    const [query, setQuery] = useState("");

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains("dark"));
    }, []);

    const toggleDarkMode = () => {
        if (isDark) {
            document.documentElement.classList.remove("dark");
            setIsDark(false);
        } else {
            document.documentElement.classList.add("dark");
            setIsDark(true);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim().length >= 2) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border glass">
            <div className="container flex h-16 items-center justify-between">
                <Link to="/" className="text-xl font-bold tracking-tight gradient-text">
                    K-Glow
                </Link>

                {showSearch && (
                    <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="검색어를 입력하세요..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full rounded-full border border-border bg-background pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </form>
                )}

                <div className="flex items-center gap-1 sm:gap-2">
                    <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
                        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </Button>

                    <Button variant="ghost" size="icon" onClick={() => navigate(isLoggedIn ? "/saved" : "/auth?next=/saved")}>
                        <Heart className="h-5 w-5" />
                    </Button>

                    <Button variant="ghost" size="icon" onClick={() => navigate(isLoggedIn ? "/account" : "/auth?next=/account")}>
                        <User className="h-5 w-5" />
                    </Button>

                    {isLoggedIn && (
                        <Button variant="ghost" size="icon" onClick={logout} title="로그아웃">
                            <LogOut className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
