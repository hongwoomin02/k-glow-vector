-- ============================================================
-- K-Glow Database Setup — Supabase SQL Editor
-- ============================================================
-- 프로젝트: K-Beauty Whisperer (K-Glow AI Search)
-- 기반 문서: ERD.md, BACKEND_DATA_IA.md
-- 실행 환경: Supabase SQL Editor (PostgreSQL 15+)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. Extensions
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "vector";      -- pgvector for embeddings

-- ────────────────────────────────────────────────────────────
-- 1. users (Supabase Auth 프로필 확장)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text        UNIQUE NOT NULL,
  name            text,
  provider        text        NOT NULL DEFAULT 'email',   -- 'email' | 'google'
  avatar_url      text,
  email_verified  boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.users IS '사용자 프로필 (auth.users 확장)';
COMMENT ON COLUMN public.users.provider IS '인증 방식: email, google';

-- ────────────────────────────────────────────────────────────
-- 2. user_preferences (사용자 선호도 — 1:1)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  skin_type             text,                             -- '건성','지성','복합','민감'
  tone                  text,                             -- '웜','쿨','뉴트럴','모름'
  concerns              text[]      NOT NULL DEFAULT '{}', -- '홍조','트러블','속건조' ...
  fragrance_free        boolean     NOT NULL DEFAULT false,
  exclude_ingredients   text[]      NOT NULL DEFAULT '{}', -- '향료','에탄올','실리콘','파라벤'
  budget_band           text,                             -- '1-3만','3-5만','5만+'
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_preferences IS '사용자 피부 조건 선호도 (1:1)';

-- ────────────────────────────────────────────────────────────
-- 3. products (제품 마스터 + 벡터 임베딩)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text        NOT NULL,
  brand                 text        NOT NULL,
  category              text        NOT NULL,              -- 'skincare','base','lip','eye','suncare'
  price_band            text,                              -- '1-3만','3-5만','5만+'
  finish                text,                              -- '글로우','새틴','크리미','매트'
  tone_fit              text,                              -- 'warm','cool','neutral','any'
  tags                  text[]      NOT NULL DEFAULT '{}',
  ingredients_top       text[]      NOT NULL DEFAULT '{}',
  ingredients_caution   text[]      NOT NULL DEFAULT '{}',
  texture_desc          text,
  explain_short         text,
  image_url             text,
  embedding             vector(1536),                      -- OpenAI text-embedding-3-small
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.products IS 'K-뷰티 제품 마스터 (벡터 검색 대상)';
COMMENT ON COLUMN public.products.embedding IS 'OpenAI text-embedding-3-small (dim=1536)';

-- ────────────────────────────────────────────────────────────
-- 4. product_similarities (유사 제품 관계)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_similarities (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  similar_product_id  uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  similarity_score    float,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, similar_product_id),
  CHECK  (product_id <> similar_product_id)
);

COMMENT ON TABLE public.product_similarities IS '제품 간 유사도 관계 (방향성 있음)';

-- ────────────────────────────────────────────────────────────
-- 5. user_saved_products (사용자 저장 제품 — N:M)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_saved_products (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id  uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

COMMENT ON TABLE public.user_saved_products IS '사용자 찜/저장 제품';

-- ────────────────────────────────────────────────────────────
-- 6. search_sessions (검색 세션 기록)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.search_sessions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        REFERENCES public.users(id) ON DELETE SET NULL,  -- 비로그인 시 NULL
  query           text        NOT NULL,
  query_embedding vector(1536),
  result_count    integer     NOT NULL DEFAULT 0,
  search_meta     jsonb,       -- top_brands, top_tags, category_distribution 등
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.search_sessions IS '검색 세션 기록 (비로그인도 기록)';
COMMENT ON COLUMN public.search_sessions.search_meta IS '검색 메타: top_brands, top_tags, category_distribution 등';

-- ────────────────────────────────────────────────────────────
-- 7. orders (결제 주문)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount        integer     NOT NULL,                        -- 원 단위 (예: 4900)
  product_type  text        NOT NULL DEFAULT 'routine_report',
  status        text        NOT NULL DEFAULT 'pending',      -- 'pending','paid','cancelled','refunded'
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.orders IS '결제 주문 (프리미엄 루틴 리포트)';

-- ────────────────────────────────────────────────────────────
-- 8. reports (AI 루틴 리포트)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id          uuid        UNIQUE REFERENCES public.orders(id) ON DELETE SET NULL,
  search_session_id uuid        REFERENCES public.search_sessions(id) ON DELETE SET NULL,
  title             text        NOT NULL,
  summary           text,
  routine_am        text[]      NOT NULL DEFAULT '{}',
  routine_pm        text[]      NOT NULL DEFAULT '{}',
  reasoning         text[]      NOT NULL DEFAULT '{}',
  warnings          text[]      NOT NULL DEFAULT '{}',
  status            text        NOT NULL DEFAULT 'generating', -- 'generating','completed','failed'
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.reports IS 'AI가 생성한 맞춤형 스킨케어 루틴 리포트';

-- ────────────────────────────────────────────────────────────
-- 9. report_alternatives (리포트 대체 제품 — N:M)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.report_alternatives (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   uuid    NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  product_id  uuid    NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order  integer NOT NULL DEFAULT 0,
  UNIQUE (report_id, product_id)
);

COMMENT ON TABLE public.report_alternatives IS '리포트 내 대체 추천 제품';

-- ────────────────────────────────────────────────────────────
-- 10. home_contents (홈 CMS 콘텐츠)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.home_contents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type  text        NOT NULL,   -- 'example_chip','example_sentence','trend_tag'
  value         text        NOT NULL,
  sort_order    integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.home_contents IS '홈 페이지 콘텐츠 (예시 칩, 문장, 트렌드 태그)';


-- ============================================================
-- INDEXES
-- ============================================================

-- products
CREATE INDEX IF NOT EXISTS idx_products_category   ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_brand      ON public.products (brand);

-- product_similarities
CREATE INDEX IF NOT EXISTS idx_prod_sim_product_id ON public.product_similarities (product_id);

-- user_saved_products
CREATE INDEX IF NOT EXISTS idx_usp_user_id    ON public.user_saved_products (user_id);
CREATE INDEX IF NOT EXISTS idx_usp_product_id ON public.user_saved_products (product_id);

-- search_sessions
CREATE INDEX IF NOT EXISTS idx_ss_user_id    ON public.search_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_ss_created_at ON public.search_sessions (created_at DESC);

-- orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON public.orders (status);

-- reports
CREATE INDEX IF NOT EXISTS idx_reports_user_id  ON public.reports (user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status   ON public.reports (status);

-- report_alternatives
CREATE INDEX IF NOT EXISTS idx_ra_report_id ON public.report_alternatives (report_id);

-- home_contents
CREATE INDEX IF NOT EXISTS idx_hc_type_active ON public.home_contents (content_type, is_active);


-- ============================================================
-- TRIGGERS — updated_at 자동 갱신
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- users
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- user_preferences
CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- products
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- orders
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- reports
CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- home_contents
CREATE TRIGGER trg_home_contents_updated_at
  BEFORE UPDATE ON public.home_contents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- FUNCTION — Supabase Auth 신규 사용자 자동 프로필 생성
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, provider, email_verified, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    now(),
    now()
  );

  -- 선호도 빈 레코드도 함께 생성
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users INSERT 트리거
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- ── users ──
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"  ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own"  ON public.users FOR UPDATE USING (auth.uid() = id);

-- ── user_preferences ──
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prefs_select_own" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "prefs_update_own" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "prefs_insert_own" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── products (공개 읽기) ──
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select_all" ON public.products FOR SELECT USING (true);

-- ── product_similarities (공개 읽기) ──
ALTER TABLE public.product_similarities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prod_sim_select_all" ON public.product_similarities FOR SELECT USING (true);

-- ── user_saved_products ──
ALTER TABLE public.user_saved_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usp_select_own"  ON public.user_saved_products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usp_insert_own"  ON public.user_saved_products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usp_delete_own"  ON public.user_saved_products FOR DELETE USING (auth.uid() = user_id);

-- ── search_sessions ──
ALTER TABLE public.search_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ss_select_own"  ON public.search_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ss_insert_all"  ON public.search_sessions FOR INSERT WITH CHECK (true);  -- 비로그인도 기록

-- ── orders ──
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_own" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_insert_own" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── reports ──
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_own" ON public.reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reports_insert_own" ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── report_alternatives (리포트 소유자만 조회) ──
ALTER TABLE public.report_alternatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ra_select_own" ON public.report_alternatives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id AND r.user_id = auth.uid()
    )
  );

-- ── home_contents (공개 읽기) ──
ALTER TABLE public.home_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hc_select_all" ON public.home_contents FOR SELECT USING (true);


-- ============================================================
-- SEED DATA — 홈 콘텐츠
-- ============================================================

INSERT INTO public.home_contents (content_type, value, sort_order) VALUES
  -- 예시 칩
  ('example_chip', '글로우 피부', 1),
  ('example_chip', '무향 스킨케어', 2),
  ('example_chip', '진정 앰플', 3),
  ('example_chip', '쿨톤 쿠션', 4),
  ('example_chip', '립 틴트', 5),
  ('example_chip', '수분 크림', 6),
  -- 예시 문장
  ('example_sentence', '하루종일 촉촉한데 끈적이지 않는 선크림 있나요', 1),
  ('example_sentence', '쿨톤에 어울리는 봄 립 추천해줘', 2),
  ('example_sentence', '민감 피부인데 레티놀 써도 되는 세럼', 3),
  -- 트렌드 태그
  ('trend_tag', '#글로우', 1),
  ('trend_tag', '#수분충전', 2),
  ('trend_tag', '#무향', 3),
  ('trend_tag', '#진정', 4),
  ('trend_tag', '#쿨톤', 5);


-- ============================================================
-- SEED DATA — 제품 (임베딩 제외, 텍스트 데이터만)
-- ============================================================

INSERT INTO public.products (id, name, brand, category, price_band, finish, tone_fit, tags, ingredients_top, ingredients_caution, texture_desc, explain_short, image_url) VALUES
  (
    'a0000001-0000-0000-0000-000000000001',
    '그린티 씨드 세럼',
    '이니스프리',
    'skincare',
    '1-3만',
    '글로우',
    'any',
    ARRAY['수분충전','글로우','진정','산뜻한'],
    ARRAY['녹차추출물','히알루론산','판테놀'],
    '{}',
    '산뜻하게 흡수되며 끈적임 없이 수분을 채워줍니다.',
    '녹차 추출물이 항산화 작용을 하며 수분 세럼 중 가성비가 뛰어납니다.',
    '/assets/products/skincare-default.png'
  ),
  (
    'a0000001-0000-0000-0000-000000000002',
    '워터뱅크 블루 히알루론 세럼',
    '라네즈',
    'skincare',
    '3-5만',
    '글로우',
    'any',
    ARRAY['수분폭탄','글로우','히알루론산'],
    ARRAY['히알루론산','글리세린','나이아신아마이드'],
    '{}',
    '물처럼 가볍고 즉각적인 수분 공급으로 피부 장벽을 강화합니다.',
    '5중 히알루론산 복합체로 피부 깊숙이 수분을 공급합니다.',
    '/assets/products/skincare-default.png'
  ),
  (
    'a0000001-0000-0000-0000-000000000003',
    '비타C 브라이트닝 앰플',
    'some by mi',
    'skincare',
    '1-3만',
    '새틴',
    'any',
    ARRAY['글로우','미백','비타민C','탄력'],
    ARRAY['비타민C 유도체','나이아신아마이드','알부틴'],
    ARRAY['향료'],
    '가벼운 에센스 타입으로 흡수가 빠르고 밝은 피부 표현에 효과적입니다.',
    '비타민C 유도체로 잡티를 개선하고 글로우 피부를 완성합니다.',
    '/assets/products/skincare-default.png'
  ),
  (
    'a0000001-0000-0000-0000-000000000004',
    '세라마이드 나이트 크림',
    '닥터자르트',
    'skincare',
    '5만+',
    '크리미',
    'any',
    ARRAY['진정','수면팩','세라마이드','장벽강화'],
    ARRAY['세라마이드','판테놀','스쿠알란'],
    '{}',
    '풍부하고 영양감 있는 크림으로 수면 중 피부 장벽을 회복시킵니다.',
    '5가지 세라마이드로 손상된 피부 장벽을 빠르게 회복합니다.',
    '/assets/products/skincare-default.png'
  ),
  (
    'a0000001-0000-0000-0000-000000000005',
    '쿠션 파운데이션 N23',
    '클리오',
    'base',
    '3-5만',
    '새틴',
    'cool',
    ARRAY['쿨톤','커버력','지속력','글로우'],
    ARRAY['티타늄디옥사이드','징크옥사이드'],
    ARRAY['향료'],
    '가볍게 발리며 오래 지속되는 쿠션 타입.',
    '쿨톤 피부에 최적화된 N23 쉐이드로 자연스러운 커버를 제공합니다.',
    '/assets/products/makeup-default.png'
  );


-- ============================================================
-- SEED DATA — 유사 제품 관계
-- ============================================================

INSERT INTO public.product_similarities (product_id, similar_product_id, similarity_score) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 0.91),
  ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 0.88),
  ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000004', 0.85),
  ('a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 0.91),
  ('a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000003', 0.87),
  ('a0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 0.88),
  ('a0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000002', 0.87),
  ('a0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', 0.85),
  ('a0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000002', 0.82);


-- ============================================================
-- VECTOR SEARCH FUNCTION (벡터 유사도 검색)
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_products(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count     int   DEFAULT 30
)
RETURNS TABLE (
  id                  uuid,
  name                text,
  brand               text,
  category            text,
  price_band          text,
  finish              text,
  tone_fit            text,
  tags                text[],
  ingredients_top     text[],
  ingredients_caution text[],
  texture_desc        text,
  explain_short       text,
  image_url           text,
  similarity          float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.brand,
    p.category,
    p.price_band,
    p.finish,
    p.tone_fit,
    p.tags,
    p.ingredients_top,
    p.ingredients_caution,
    p.texture_desc,
    p.explain_short,
    p.image_url,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM public.products p
  WHERE p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.search_products IS '벡터 유사도 기반 제품 검색 (cosine similarity)';


-- ============================================================
-- 완료 메시지
-- ============================================================
DO $$ BEGIN RAISE NOTICE '✅ K-Glow DB 셋업 완료 — 테이블 10개, 인덱스, 트리거, RLS, 시드 데이터, 벡터 검색 함수 생성됨'; END $$;
