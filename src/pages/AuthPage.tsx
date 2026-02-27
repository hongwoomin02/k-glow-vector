import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Mail, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const intentMessages: Record<string, string> = {
    save: "제품을 저장하려면 로그인이 필요합니다",
    buy_report: "프리미엄 리포트를 구매하려면 로그인이 필요합니다",
};

export default function AuthPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { isLoggedIn, loading: authLoading, login, signup, loginWithGoogle } = useAuth();

    const nextPath = searchParams.get("next") || "/";
    const intent = searchParams.get("intent") || "";

    const [isLoginMode, setIsLoginMode] = useState(true);
    const [loading, setLoading] = useState(false);
    const [signupSuccess, setSignupSuccess] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    // If already logged in, redirect
    useEffect(() => {
        if (!authLoading && isLoggedIn) {
            navigate(nextPath, { replace: true });
        }
    }, [isLoggedIn, authLoading, nextPath, navigate]);

    const validate = () => {
        if (!email.trim() || !email.includes("@")) {
            setErrorMsg("유효한 이메일을 입력해주세요.");
            return false;
        }
        if (password.length < 6) {
            setErrorMsg("비밀번호는 6자 이상이어야 합니다.");
            return false;
        }
        setErrorMsg("");
        return true;
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        if (isLoginMode) {
            const { error } = await login(email, password);
            setLoading(false);
            if (error) {
                setErrorMsg(error);
            } else {
                toast.success("로그인되었습니다.");
                navigate(nextPath, { replace: true });
            }
        } else {
            const { error } = await signup(email, password);
            setLoading(false);
            if (error) {
                setErrorMsg(error);
            } else {
                setSignupSuccess(true);
            }
        }
    };

    const handleGoogleLogin = async () => {
        await loginWithGoogle();
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/30">
            <div className="w-full max-w-md space-y-8 glass p-8 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-accent" />

                <div className="text-center space-y-2">
                    <Link to="/" className="inline-block text-2xl font-bold tracking-tight gradient-text mb-4">
                        K-Glow
                    </Link>
                    <h2 className="text-2xl font-bold">
                        {isLoginMode ? "환영합니다" : "가입하기"}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {isLoginMode
                            ? "K-Glow AI 검색으로 나만의 뷰티 루틴을 찾아보세요."
                            : "계정을 만들고 모든 뷰티 리포트를 관리하세요."}
                    </p>
                </div>

                {intent && intentMessages[intent] && (
                    <div className="bg-primary/10 text-primary p-4 rounded-xl text-sm flex gap-3 mt-6 border border-primary/20">
                        <Info className="w-5 h-5 shrink-0" />
                        <p>{intentMessages[intent]}</p>
                    </div>
                )}

                {signupSuccess ? (
                    <div className="text-center space-y-6 py-8">
                        <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-2xl">
                            ✓
                        </div>
                        <h3 className="text-xl font-bold">가입 완료!</h3>
                        <p className="text-muted-foreground text-sm text-balance">
                            이메일 주소 인증을 위해 <strong>{email}</strong>로 확인 메일을 보냈습니다.
                        </p>
                        <Button
                            className="w-full rounded-xl h-12"
                            onClick={() => {
                                setSignupSuccess(false);
                                setIsLoginMode(true);
                            }}
                        >
                            로그인하러 가기
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6 mt-8">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full h-12 rounded-xl border-border bg-background hover:bg-muted font-medium text-foreground gap-3 relative"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                        >
                            <svg className="w-5 h-5 absolute left-4" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google 계정으로 계속
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">이메일로 진행</span>
                            </div>
                        </div>

                        <form onSubmit={handleEmailSubmit} className="space-y-4">
                            <div className="space-y-1 text-left">
                                <label className="text-sm font-medium text-foreground ml-1">이메일</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
                                        placeholder="name@example.com"
                                        className="w-full h-12 rounded-xl border border-border bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1 text-left">
                                <label className="text-sm font-medium text-foreground ml-1">비밀번호</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
                                    placeholder={isLoginMode ? "비밀번호 입력" : "6자 이상 입력"}
                                    className="w-full h-12 rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    required
                                />
                            </div>

                            {errorMsg && (
                                <div className="text-sm text-destructive pl-1">{errorMsg}</div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-12 rounded-xl mt-6 relative"
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    isLoginMode ? "이메일로 로그인" : "회원가입"
                                )}
                            </Button>
                        </form>

                        <div className="text-center mt-6">
                            <button
                                type="button"
                                className="text-sm text-primary hover:underline hover:text-primary/80 transition-colors"
                                onClick={() => {
                                    setIsLoginMode(!isLoginMode);
                                    setErrorMsg("");
                                    setEmail("");
                                    setPassword("");
                                }}
                            >
                                {isLoginMode ? "계정이 없으신가요? 가입하기" : "이미 계정이 있으신가요? 로그인"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
