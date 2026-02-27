import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isLoggedIn, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">로딩 중...</div>
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <Navigate
                to={`/auth?next=${encodeURIComponent(location.pathname + location.search)}`}
                replace
            />
        );
    }

    return <>{children}</>;
}
