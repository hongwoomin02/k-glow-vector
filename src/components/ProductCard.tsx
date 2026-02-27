import { Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export interface Product {
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
    texture_desc?: string;
    explain_short: string;
    image_url: string;
}

interface ProductCardProps {
    product: Product;
    saved?: boolean;
    onSaveToggle?: () => void;
    index?: number;
    compareMode?: boolean;
    isSelected?: boolean;
    onSelectToggle?: () => void;
    onClick?: () => void;
}

const categoryLabels: Record<string, string> = {
    skincare: "스킨케어",
    base: "베이스",
    lip: "립",
    eye: "아이",
    suncare: "선케어",
};

export default function ProductCard({
    product,
    saved = false,
    onSaveToggle,
    index = 0,
    compareMode = false,
    isSelected = false,
    onSelectToggle,
    onClick,
}: ProductCardProps) {
    const { isLoggedIn } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSaveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isLoggedIn) {
            navigate(`/auth?next=${encodeURIComponent(location.pathname + location.search)}&intent=save`);
            return;
        }
        if (onSaveToggle) onSaveToggle();
    };

    const handleCardClick = () => {
        if (onClick) {
            onClick();
        } else if (compareMode && onSelectToggle) {
            onSelectToggle();
        } else {
            navigate(`/p/${product.id}`);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={handleCardClick}
            className={`relative flex gap-4 p-4 rounded-xl border border-border bg-card transition-colors cursor-pointer ${compareMode ? "hover:bg-muted/50" : "hover:shadow-md"
                }`}
        >
            {compareMode && (
                <div className="absolute top-4 left-4 z-10 flex h-5 w-5 items-center justify-center rounded border border-primary bg-background shadow">
                    {isSelected && <div className="h-3 w-3 rounded-sm bg-primary" />}
                </div>
            )}

            <div className={`h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted ${compareMode ? "ml-6" : ""}`}>
                <img
                    src={product.image_url || "/assets/products/product-1.png"}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                />
            </div>

            <div className="flex flex-1 flex-col justify-between overflow-hidden">
                <div>
                    <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-foreground truncate pl-1">{product.name}</h3>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 truncate">
                        <span className="font-medium text-foreground">{product.brand}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{categoryLabels[product.category] || product.category}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{product.price_band}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                        {product.explain_short}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                        {product.tags?.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                {!compareMode && (
                    <div className="flex items-center justify-between mt-3">
                        <Button
                            variant={saved ? "default" : "outline"}
                            size="sm"
                            className="h-8 rounded-full px-3 text-xs"
                            onClick={handleSaveClick}
                        >
                            <Heart className={`h-3 w-3 mr-1.5 ${saved ? "fill-current" : ""}`} />
                            {saved ? "저장됨" : "저장"}
                        </Button>

                        <div className="flex items-center text-xs font-medium text-primary cursor-pointer hover:underline">
                            상세 보기 <ArrowRight className="h-3 w-3 ml-1" />
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
