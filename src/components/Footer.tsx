import { Link } from "react-router-dom";

export default function Footer() {
    return (
        <footer className="w-full border-t border-border mt-auto py-6 bg-background">
            <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                <div>&copy; 2026 K-Glow</div>
                <div className="flex items-center gap-4">
                    <Link to="#" className="hover:underline">서비스 소개</Link>
                    <Link to="#" className="hover:underline">개인정보 처리방침</Link>
                    <Link to="#" className="hover:underline">문의</Link>
                </div>
            </div>
        </footer>
    );
}
