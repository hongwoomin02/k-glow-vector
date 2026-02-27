# BACKEND_DATA_IA — 페이지 라우터별 백엔드 데이터 요구사항

> **프로젝트**: K-Beauty Whisperer (K-Glow AI Search)  
> **버전**: V1  
> **목적**: 프론트엔드 목업 기반으로 실제 백엔드 구축 시 필요한 CRUD 데이터 항목을 **페이지 라우터별**로 정리한 IA(Information Architecture) 문서

---

## 범례

| 기호 | 의미 |
|------|------|
| **R** | Read (GET, SELECT) — 백엔드에서 조회 |
| **C** | Create (POST, INSERT) — 백엔드에 생성 |
| **U** | Update (PUT/PATCH, UPDATE) — 백엔드에서 수정 |
| **D** | Delete (DELETE) — 백엔드에서 삭제 |
| 🔓 | Public (비로그인 접근 가능) |
| 🔒 | Protected (로그인 필수) |

---

## 1. 홈 페이지 — `/` 🔓

### 1-1. 페이지 콘텐츠 (Static/CMS)

| # | 데이터 | CRUD | 설명 |
|---|--------|------|------|
| 1 | `exampleChips` | **R** | 예시 검색 칩 목록 (예: "글로우 피부", "무향 스킨케어") |
| 2 | `exampleSentences` | **R** | 예시 검색 문장 목록 (예: "하루종일 촉촉한데 끈적이지 않는 선크림 있나요") |
| 3 | `trendTags` | **R** | 인기 태그 목록 (예: "#글로우", "#수분충전") |

### 1-2. 사용자별 데이터 (로그인 시)

| # | 데이터 | CRUD | 설명 |
|---|--------|------|------|
| 4 | `recentSearches` | **R** | 로그인 사용자의 최근 검색 기록 (최대 3건) — `query`, `created_at` |
| 5 | 검색 세션 생성 | **C** | 사용자가 검색 제출 시 새로운 검색 세션 기록 저장 |

### 1-3. 홈 페이지 API 정리

| API | Method | Auth | 설명 |
|-----|--------|------|------|
| `GET /api/home/content` | GET | 🔓 | exampleChips, exampleSentences, trendTags |
| `GET /api/users/me/recent-searches` | GET | 🔒 | 최근 검색 기록 조회 (limit 3) |

---

## 2. 검색 결과 페이지 — `/search?q={query}` 🔓

### 2-1. 검색 요청 및 결과

| # | 데이터 | CRUD | 설명 |
|---|--------|------|------|
| 1 | 검색 쿼리 (query) | **C** | 사용자 검색 쿼리를 서버로 전송 → 벡터 임베딩 생성 → 유사도 검색 실행 |
| 2 | `search_meta` | **R** | 검색 메타 정보 응답 — `model`, `embedding_dim`, `match_threshold`, `candidates_found`, `results_after_filter`, `top_similarity`, `avg_similarity`, `top_brands[]`, `top_tags[]`, `category_distribution{}` |
| 3 | `results[]` (제품 배열) | **R** | 검색 결과 제품 배열 — 각 항목: `id`, `name`, `brand`, `category`, `price_band`, `finish`, `tone_fit`, `tags[]`, `ingredients_top[]`, `ingredients_caution[]`, `explain_short`, `image_url`, `similarity_score` |

### 2-2. 검색 세션 기록

| # | 데이터 | CRUD | 설명 |
|---|--------|------|------|
| 4 | 검색 세션 | **C** | 검색 실행 시 세션 기록 생성 — `user_id` (nullable), `query`, `result_count`, `created_at` |

### 2-3. 사용자 저장 상태

| # | 데이터 | CRUD | 설명 |
|---|--------|------|------|
| 5 | `savedProductIds[]` | **R** | 로그인 사용자의 저장된 제품 ID 목록 (검색 결과에 저장 상태 표시용) |
| 6 | 제품 저장 | **C** | "♡ 저장" 클릭 시 `user_saved_products` 레코드 생성 |
| 7 | 제품 저장 해제 | **D** | "♡ 저장됨" → 재클릭 시 `user_saved_products` 레코드 삭제 |

### 2-4. 결제 / 리포트 생성

| # | 데이터 | CRUD | 설명 |
|---|--------|------|------|
| 8 | 결제 주문 | **C** | PaymentModal "결제 완료" 시 주문(order) 레코드 생성 — `user_id`, `amount` (₩4,900), `product_type` ("routine_report"), `status` ("paid") |
| 9 | 리포트 생성 요청 | **C** | 결제 완료 후 AI 루틴 리포트 생성 트리거 — `user_id`, `search_session_id`, `order_id` |

### 2-5. 검색 결과 페이지 API 정리

| API | Method | Auth | 설명 |
|-----|--------|------|------|
| `POST /api/search` | POST | 🔓 | 벡터 검색 실행 (query → embedding → similarity search) |
| `GET /api/users/me/saved-products/ids` | GET | 🔒 | 저장 제품 ID 목록 |
| `POST /api/users/me/saved-products` | POST | 🔒 | 제품 저장 |
| `DELETE /api/users/me/saved-products/:productId` | DELETE | 🔒 | 제품 저장 해제 |
| `POST /api/orders` | POST | 🔒 | 결제 주문 생성 |
| `POST /api/reports` | POST | 🔒 | AI 리포트 생성 요청 |

---

## 3. 제품 상세 페이지 — `/p/:productId` 🔓

### 3-1. 제품 정보

| # | 데이터 | CRUD | 설명 |
|---|--------|------|------|
| 1 | 제품 상세 | **R** | 단일 제품 전체 정보 — `id`, `name`, `brand`, `category`, `price_band`, `finish`, `tone_fit`, `tags[]`, `ingredients_top[]`, `ingredients_caution[]`, `texture_desc`, `explain_short`, `image_url`, `similar_ids[]` |
| 2 | 유사 제품 목록 | **R** | `similar_ids[]`에 해당하는 제품 요약 정보 목록 (이미지, 이름, 브랜드) |

### 3-2. 사용자 인터랙션

| # | 데이터 | CRUD | 설명 |
|---|--------|------|------|
| 3 | 제품 저장 여부 | **R** | 현재 제품이 사용자 저장 목록에 있는지 확인 |
| 4 | 제품 저장 | **C** | "♡ 저장" 클릭 시 `user_saved_products` 레코드 생성 |
| 5 | 제품 저장 해제 | **D** | "저장됨" 재클릭 시 `user_saved_products` 레코드 삭제 |
| 6 | 결제 주문 | **C** | "리포트 만들기" CTA → PaymentModal "결제 완료" 시 주문 생성 |
| 7 | 리포트 생성 요청 | **C** | 결제 완료 후 리포트 생성 트리거 |

### 3-3. 제품 상세 페이지 API 정리

| API | Method | Auth | 설명 |
|-----|--------|------|------|
| `GET /api/products/:productId` | GET | 🔓 | 제품 상세 정보 조회 |
| `GET /api/products/:productId/similar` | GET | 🔓 | 유사 제품 목록 조회 |
| `GET /api/users/me/saved-products/:productId` | GET | 🔒 | 해당 제품 저장 여부 확인 |
| `POST /api/users/me/saved-products` | POST | 🔒 | 제품 저장 |
| `DELETE /api/users/me/saved-products/:productId` | DELETE | 🔒 | 제품 저장 해제 |
| `POST /api/orders` | POST | 🔒 | 결제 주문 생성 |
| `POST /api/reports` | POST | 🔒 | AI 리포트 생성 요청 |

---

## 4. 저장한 제품 페이지 — `/saved` 🔒

### 4-1. 저장 제품 목록

| # | 데이터 | CRUD | 설명 |
|---|--------|------|------|
| 1 | 저장 제품 전체 목록 | **R** | 사용자가 저장한 모든 제품 목록 — 각 항목: `id`, `name`, `brand`, `category`, `price_band`, `finish`, `tone_fit`, `tags[]`, `ingredients_top[]`, `ingredients_caution[]`, `texture_desc`, `explain_short`, `image_url` |
| 2 | 제품 저장 해제 | **D** | "♡ 저장 해제" 클릭 시 `user_saved_products` 레코드 삭제 |

### 4-2. 비교 기능 (클라이언트 처리, 추가 API 불필요)

| # | 데이터 | CRUD | 설명 |
|---|--------|------|------|
| 3 | 비교 대상 선택 | — | 클라이언트 로컬 상태 (최대 3개 선택) |
| 4 | 비교 테이블 데이터 | — | 이미 조회된 저장 제품 데이터에서 추출 (추가 API 없음) |

### 4-3. 저장 제품 페이지 API 정리

| API | Method | Auth | 설명 |
|-----|--------|------|------|
| `GET /api/users/me/saved-products` | GET | 🔒 | 저장 제품 전체 목록 (제품 상세 정보 포함) |
| `DELETE /api/users/me/saved-products/:productId` | DELETE | 🔒 | 제품 저장 해제 |

---

## 5. 내 계정 페이지 — `/account` 🔒

### 5-1. TAB: 내 조건 (Preferences)

| # | 데이터 | CRUD | 설명 |
|---|--------|------|------|
| 1 | 사용자 선호도 조회 | **R** | 현재 저장된 선호도 — `skin_type`, `tone`, `concerns[]`, `fragrance_free`, `exclude_ingredients[]`, `budget_band` |
| 2 | 선호도 옵션 목록 | **R** | 선택 가능한 옵션 목록 — `skinTypes[]`, `tones[]`, `concerns[]`, `excludeOpts[]`, `budgets[]` |
| 3 | 선호도 저장 | **U** | "저장" 클릭 시 사용자 선호도 업데이트 |
| 4 | 선호도 초기화 | **U** | "초기화" 클릭 시 선호도를 빈 값으로 업데이트 |

### 5-2. TAB: 검색 로그

| # | 데이터 | CRUD | 설명 |
|---|--------|------|------|
| 5 | 검색 로그 목록 | **R** | 사용자의 과거 검색 기록 목록 — `query`, `created_at`, `result_count` |

### 5-3. 내 계정 페이지 API 정리

| API | Method | Auth | 설명 |
|-----|--------|------|------|
| `GET /api/users/me/preferences` | GET | 🔒 | 선호도 조회 |
| `GET /api/preferences/options` | GET | 🔓 | 선택 가능한 옵션 목록 (정적 데이터) |
| `PUT /api/users/me/preferences` | PUT | 🔒 | 선호도 저장/업데이트 |
| `GET /api/users/me/search-logs` | GET | 🔒 | 검색 로그 목록 조회 |

---

## 6. AI 루틴 리포트 페이지 — `/report/:reportId` 🔒

### 6-1. 리포트 데이터

| # | 데이터 | CRUD | 설명 |
|---|--------|------|------|
| 1 | 리포트 상세 | **R** | 리포트 전체 정보 — `reportId`, `title`, `created_at`, `summary`, `routine_am[]`, `routine_pm[]`, `reasoning[]`, `warnings[]`, `alternatives[]` |
| 2 | 대체 제품 정보 | **R** | `alternatives[]` ID에 해당하는 제품 요약 — `id`, `name`, `brand`, `image_url` |

### 6-2. 리포트 페이지 API 정리

| API | Method | Auth | 설명 |
|-----|--------|------|------|
| `GET /api/reports/:reportId` | GET | 🔒 | 리포트 상세 조회 (대체 제품 정보 포함) |

> **NOTE**: 리포트 생성(C)은 검색 결과 페이지 또는 제품 상세 페이지의 PaymentModal에서 트리거됨  
> 이 페이지 자체는 **Read-Only**

---

## 7. 인증 페이지 — `/auth` 🔓

### 7-1. 인증 데이터

| # | 데이터 | CRUD | 설명 |
|---|--------|------|------|
| 1 | Google OAuth 로그인 | **C/R** | Google OAuth 토큰 검증 → 사용자 세션 생성 / 기존 사용자 조회 |
| 2 | 이메일/비밀번호 로그인 | **R** | 이메일/비밀번호 검증 → 세션 토큰 발급 |
| 3 | 이메일 회원가입 | **C** | 새 사용자 레코드 생성 — `email`, `password_hash`, `name` (선택) |
| 4 | 이메일 인증 메일 발송 | **C** | 회원가입 시 인증 메일 발송 트리거 |

### 7-2. 인증 관련 데이터 스키마

| 필드 | 타입 | 설명 |
|------|------|------|
| `email` | string | 이메일 주소 (unique, not null) |
| `password` | string | 비밀번호 (6자 이상, 해시 저장) |
| `name` | string | 이름 (선택, nullable) |
| `provider` | enum | 인증 방식 (`email`, `google`) |

### 7-3. 인증 페이지 API 정리

| API | Method | Auth | 설명 |
|-----|--------|------|------|
| `POST /api/auth/google` | POST | 🔓 | Google OAuth 로그인/가입 |
| `POST /api/auth/login` | POST | 🔓 | 이메일/비밀번호 로그인 |
| `POST /api/auth/signup` | POST | 🔓 | 이메일 회원가입 |
| `POST /api/auth/logout` | POST | 🔒 | 로그아웃 (세션 무효화) |

---

## 부록 A. 전체 API Endpoint 요약

| # | Method | Endpoint | Auth | 관련 페이지 |
|---|--------|----------|------|-------------|
| 1 | GET | `/api/home/content` | 🔓 | 홈 |
| 2 | POST | `/api/search` | 🔓 | 검색 결과 |
| 3 | GET | `/api/products/:productId` | 🔓 | 제품 상세 |
| 4 | GET | `/api/products/:productId/similar` | 🔓 | 제품 상세 |
| 5 | GET | `/api/users/me/recent-searches` | 🔒 | 홈 |
| 6 | GET | `/api/users/me/saved-products` | 🔒 | 저장 목록 |
| 7 | GET | `/api/users/me/saved-products/ids` | 🔒 | 검색 결과 |
| 8 | GET | `/api/users/me/saved-products/:productId` | 🔒 | 제품 상세 |
| 9 | POST | `/api/users/me/saved-products` | 🔒 | 검색, 제품 상세 |
| 10 | DELETE | `/api/users/me/saved-products/:productId` | 🔒 | 검색, 저장, 제품 상세 |
| 11 | GET | `/api/users/me/preferences` | 🔒 | 계정 |
| 12 | PUT | `/api/users/me/preferences` | 🔒 | 계정 |
| 13 | GET | `/api/preferences/options` | 🔓 | 계정 |
| 14 | GET | `/api/users/me/search-logs` | 🔒 | 계정 |
| 15 | POST | `/api/orders` | 🔒 | 검색, 제품 상세 |
| 16 | GET | `/api/reports/:reportId` | 🔒 | 리포트 |
| 17 | POST | `/api/reports` | 🔒 | 검색, 제품 상세 |
| 18 | POST | `/api/auth/google` | 🔓 | 인증 |
| 19 | POST | `/api/auth/login` | 🔓 | 인증 |
| 20 | POST | `/api/auth/signup` | 🔓 | 인증 |
| 21 | POST | `/api/auth/logout` | 🔒 | Header (전역) |

---

## 부록 B. 핵심 데이터 엔터티 요약

| 엔터티 | 주요 필드 | 관련 페이지 |
|--------|-----------|-------------|
| **User** | `id`, `email`, `password_hash`, `name`, `provider`, `created_at` | 인증, 계정 |
| **UserPreference** | `user_id`, `skin_type`, `tone`, `concerns[]`, `fragrance_free`, `exclude_ingredients[]`, `budget_band` | 계정 |
| **Product** | `id`, `name`, `brand`, `category`, `price_band`, `finish`, `tone_fit`, `tags[]`, `ingredients_top[]`, `ingredients_caution[]`, `texture_desc`, `explain_short`, `image_url`, `embedding` | 검색, 제품 상세, 저장, 리포트 |
| **ProductSimilarity** | `product_id`, `similar_product_id` | 제품 상세 |
| **UserSavedProduct** | `user_id`, `product_id`, `created_at` | 검색, 제품 상세, 저장 |
| **SearchSession** | `id`, `user_id`, `query`, `result_count`, `created_at` | 홈, 검색, 계정 |
| **Order** | `id`, `user_id`, `amount`, `product_type`, `status`, `created_at` | 검색, 제품 상세 |
| **Report** | `id`, `user_id`, `order_id`, `search_session_id`, `title`, `summary`, `routine_am[]`, `routine_pm[]`, `reasoning[]`, `warnings[]`, `alternative_ids[]`, `created_at` | 리포트 |
| **HomeContent** | `exampleChips[]`, `exampleSentences[]`, `trendTags[]` | 홈 |
