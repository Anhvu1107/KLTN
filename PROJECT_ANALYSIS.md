# 📋 AURA ARCHIVE — Phân Tích Toàn Diện Dự Án (Chi Tiết Từng Dòng Code)

> **Tên dự án**: AURA ARCHIVE — Luxury Resell & Consignment Fashion E-commerce  
> **Phân tích bởi**: Senior Developer Review  
> **Ngày**: 2026-03-06  
> **Loại dự án**: Full-stack Monorepo (Client + Server + AI Service)

---

## MỤC LỤC

1. [Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
2. [Tech Stack Chi Tiết](#2-tech-stack-chi-tiết)
3. [Cấu Trúc Thư Mục Đầy Đủ](#3-cấu-trúc-thư-mục-đầy-đủ)
4. [SERVER — Backend Express.js](#4-server--backend-expressjs)
5. [DATABASE — Schema Chi Tiết](#5-database--schema-chi-tiết)
6. [API ENDPOINTS — Bảng Đầy Đủ](#6-api-endpoints--bảng-đầy-đủ)
7. [CLIENT — Frontend Nuxt.js 3](#7-client--frontend-nuxtjs-3)
8. [AI SERVICE — FastAPI](#8-ai-service--fastapi)
9. [Authentication & Security](#9-authentication--security)
10. [Payment Integrations](#10-payment-integrations)
11. [Deployment & Infrastructure](#11-deployment--infrastructure)
12. [Design System](#12-design-system)
13. [Seed Data](#13-seed-data)
14. [Đánh Giá Chi Tiết & Nhận Xét Senior Dev](#14-đánh-giá-chi-tiết--nhận-xét-senior-dev)

---

## 1. Tổng Quan Kiến Trúc

```
┌─────────────────────────────────────────────────────┐
│                   NGINX (Port 80)                   │
│              Reverse Proxy / Load Balancer           │
└────────┬──────────────┬──────────────┬──────────────┘
         │              │              │
    /api/**         /ai/**          /*
         │              │              │
    ┌────▼────┐   ┌─────▼─────┐  ┌────▼────┐
    │ Server  │   │ AI Service│  │ Client  │
    │ Express │   │  FastAPI  │  │  Nuxt 3 │
    │ :5000   │   │  :8000    │  │  :3000  │
    └────┬────┘   └───────────┘  └─────────┘
         │
    ┌────▼────────┐
    │ PostgreSQL  │
    │    :5432    │
    └─────────────┘
```

**Luồng hoạt động**:
1. User → Nginx → Client (Nuxt SSR) → Render trang
2. Client gọi API → Nitro proxy `/api/**` → Server Express
3. Chatbot AI → Server proxy → AI Service FastAPI → OpenAI API
4. Server → Sequelize ORM → PostgreSQL

---

## 2. Tech Stack Chi Tiết

### Frontend
| Công nghệ | Version | Chức năng |
|-----------|---------|-----------|
| Nuxt.js | 3.15.0 | SSR Framework |
| Vue.js | 3.5.12 | UI Framework |
| Tailwind CSS | 6.12.2 (module) | Utility-first CSS |
| Pinia | 2.2.6 | State Management |
| @nuxtjs/i18n | 8.2.0 | Song ngữ EN/VI |
| Chart.js + vue-chartjs | 4.5.1 / 5.3.3 | Biểu đồ Dashboard |
| Headless UI | 1.7.22 | Accessible UI |
| Heroicons | 2.1.5 | Icons |

### Backend
| Công nghệ | Version | Chức năng |
|-----------|---------|-----------|
| Express.js | 4.21.1 | Web Framework |
| Sequelize | 6.37.5 | ORM for PostgreSQL |
| PostgreSQL (pg) | 8.13.1 | Database driver |
| jsonwebtoken | 9.0.2 | JWT Auth |
| bcryptjs | 2.4.3 | Password hashing (12 rounds) |
| Helmet | 8.0.0 | Security headers |
| express-rate-limit | 7.4.1 | Rate limiting |
| Multer | 1.4.5 | File uploads |
| Nodemailer | 6.9.16 | Email sending |
| Winston | 3.15.0 | Structured logging |
| Morgan | 1.10.0 | HTTP request logging |
| google-auth-library | 10.5.0 | Google OAuth |
| Faker.js | 10.2.0 | Seed data generation |

### AI Service (Python)
| Công nghệ | Version | Chức năng |
|-----------|---------|-----------|
| FastAPI | ≥0.115.0 | Async Web Framework |
| OpenAI SDK | ≥1.50.0 | GPT API Client |
| LangChain | ≥0.3.0 | AI Orchestration |
| Pydantic | ≥2.9.0 | Data validation |
| HTTPX | ≥0.27.0 | Async HTTP |

---

## 3. Cấu Trúc Thư Mục Đầy Đủ

```
KLTN/
├── client/                          # 🖥️ FRONTEND (Nuxt 3)
│   ├── app.vue                      # Root component
│   ├── nuxt.config.ts               # Nuxt config (SSR, proxy, i18n, modules)
│   ├── tailwind.config.js           # Design system tokens (127 dòng)
│   ├── i18n.config.ts               # i18n setup
│   ├── assets/css/tailwind.css      # Tailwind entry
│   ├── components/ (43 files, 13 dirs)
│   │   ├── AiChatWidget.vue         # AI chatbot floating widget
│   │   ├── CurrencySwitcher.vue     # Toggle VND/USD
│   │   ├── LanguageSwitcher.vue     # Toggle EN/VI
│   │   ├── admin/ (2)              # AdminSidebar, AdminCard
│   │   ├── ai/ (2)                 # AiChat components
│   │   ├── auth/ (1)              # AuthForm
│   │   ├── cart/ (2)              # CartItem, CartSummary
│   │   ├── chat/ (1)             # ChatMessage
│   │   ├── checkout/ (2)         # CheckoutForm, PaymentMethod
│   │   ├── common/ (8)           # Modal, Toast, Pagination, Badge...
│   │   ├── home/ (3)             # HeroBanner, FeaturedSection, BrandGrid
│   │   ├── layout/ (3)           # Header, Footer, MobileMenu
│   │   ├── navigation/ (1)       # Breadcrumb
│   │   ├── product/ (12)         # ProductCard, Gallery, Filters, ReviewForm...
│   │   ├── search/ (1)           # SearchDropdown
│   │   └── skeleton/ (2)         # ProductSkeleton, PageSkeleton
│   ├── composables/ (11 files)
│   │   ├── useApi.ts              # GET/POST/PUT/PATCH/DELETE + auto JWT
│   │   ├── useAuth.ts             # Auth state & methods
│   │   ├── useAuthToken.ts        # Token get/set/remove
│   │   ├── useCart.ts             # Cart logic
│   │   ├── useCompare.ts          # So sánh SP (max 4)
│   │   ├── useCurrency.ts         # VND↔USD (rate 25000)
│   │   ├── useImageUrl.ts         # SSR-safe image URL resolver
│   │   ├── useNavigation.ts       # Menu items
│   │   ├── useNotification.ts     # Toast notifications
│   │   ├── useRecentlyViewed.ts   # Recent products (localStorage)
│   │   └── useSanitizeHtml.ts     # XSS protection
│   ├── layouts/ (3)
│   │   ├── default.vue            # Customer layout (header+footer+AI widget)
│   │   ├── admin.vue              # Admin layout (sidebar+topbar)
│   │   └── auth.vue               # Auth layout (minimal)
│   ├── locales/
│   │   ├── en.json                # English translations
│   │   └── vi.json                # Vietnamese translations
│   ├── middleware/ (3)
│   │   ├── auth.ts                # Require login → redirect /auth/login
│   │   ├── admin.ts               # Require ADMIN role → redirect /
│   │   └── guest.ts               # Only guests → redirect /
│   ├── pages/ (48 files, 6 dirs)
│   │   ├── index.vue (23.6KB)     # Homepage: Hero, Featured, New Arrivals
│   │   ├── about.vue              # About page
│   │   ├── cart.vue (10KB)        # Shopping cart
│   │   ├── checkout.vue (12.5KB)  # Checkout flow
│   │   ├── compare.vue            # Compare products (max 4)
│   │   ├── contact.vue            # Contact form
│   │   ├── featured.vue           # Featured products
│   │   ├── new-arrivals.vue       # New arrivals (14 days)
│   │   ├── sale.vue               # Sale products
│   │   ├── privacy.vue / terms.vue
│   │   ├── shop/
│   │   │   ├── index.vue          # Shop page with filters
│   │   │   └── [slug].vue         # Product detail (dynamic route)
│   │   ├── auth/
│   │   │   ├── login.vue
│   │   │   ├── register.vue
│   │   │   ├── forgot-password.vue
│   │   │   └── reset-password.vue
│   │   ├── account/
│   │   │   ├── index.vue          # Account dashboard
│   │   │   ├── profile.vue        # Edit profile
│   │   │   ├── orders.vue         # Order history
│   │   │   ├── orders/[id].vue    # Order detail
│   │   │   ├── wishlist.vue       # Wishlist
│   │   │   └── addresses.vue      # Saved addresses
│   │   ├── admin/ (21 files)
│   │   │   ├── dashboard.vue (10KB) # Stats + revenue charts
│   │   │   ├── products/ (4)       # CRUD + variants
│   │   │   ├── orders/ (3)         # List + detail + status mgmt
│   │   │   ├── users/ (2)          # List + detail
│   │   │   ├── coupons/ (1)
│   │   │   ├── reviews/ (1)        # Moderation
│   │   │   ├── banners/ (1)
│   │   │   ├── blogs/ (1)
│   │   │   ├── popups/ (1)
│   │   │   ├── ai-config/ (1)      # Edit AI system prompt
│   │   │   ├── settings/ (3)       # Site settings
│   │   │   └── abandoned-carts/ (1)
│   │   ├── blog/ (2)
│   │   └── payment/
│   │       ├── success.vue
│   │       └── failed.vue
│   ├── plugins/ (3)
│   ├── services/ (5)               # API service layer
│   │   ├── auth.api.ts / chat.api.ts / order.api.ts
│   │   ├── product.api.ts / user.api.ts
│   ├── stores/ (6)                  # Pinia stores
│   │   ├── auth.ts (209 dòng)      # Login/register/logout/fetchUser
│   │   ├── cart.ts (239 dòng)      # Cart + checkout + coupon
│   │   ├── cart.store.ts / product.store.ts
│   │   ├── notification.store.ts / user.store.ts
│   ├── types/ (5)                   # TypeScript types
│   └── utils/ (3)
│
├── server/                          # ⚙️ BACKEND (Express.js)
│   ├── server.js (188 dòng)        # Entry point
│   ├── package.json
│   ├── Dockerfile / Dockerfile.dev
│   ├── uploads/                     # Uploaded images
│   └── src/
│       ├── config/ (4)
│       │   ├── db.config.js         # PostgreSQL (dev/test/prod pools)
│       │   ├── cors.config.js / email.config.js / jwt.config.js
│       ├── constants/ (2)
│       ├── controllers/ (19)
│       │   ├── auth.controller.js (107 dòng)
│       │   ├── admin.controller.js (340 dòng) — LARGEST
│       │   ├── product.controller.js (143 dòng)
│       │   ├── order.controller.js (140 dòng)
│       │   ├── payment.controller.js (365 dòng) — COMPLEX
│       │   ├── review / user / coupon / wishlist / address
│       │   ├── banner / blog / chat / contact / newsletter
│       │   ├── variant / shipping / location / site-settings
│       ├── middlewares/ (5)
│       │   ├── auth.middleware.js    # protect + optionalAuth
│       │   ├── admin.middleware.js   # adminOnly
│       │   ├── error.middleware.js   # errorHandler + notFound
│       │   ├── upload.middleware.js  # Multer config
│       │   └── validate.middleware.js # Express-validator
│       ├── models/ (19)
│       │   ├── index.js (86 dòng)   # Registry + auto-association
│       │   ├── user / product / variant / order / order-item
│       │   ├── review / wishlist / coupon / coupon-usage / address
│       │   ├── banner / blog / chat-log / newsletter
│       │   ├── system-prompt / site-settings (9KB) / popup
│       │   └── abandoned-cart
│       ├── routes/
│       │   ├── index.js             # Route aggregation
│       │   └── v1/ (18 route files)
│       ├── services/ (27)           # Business logic
│       │   ├── auth / admin / product / product-admin / order
│       │   ├── user / review / coupon / wishlist / address
│       │   ├── banner / blog / chat / email / upload
│       │   ├── shipping / location / site-settings / popup
│       │   ├── ai / oauth / abandoned-cart / variant / newsletter
│       │   ├── momo / vnpay / paypal / vietqr  ← PAYMENTS
│       ├── utils/ (6)
│       │   ├── AppError.js          # Custom Error class
│       │   ├── catchAsync.js        # Async error wrapper
│       │   ├── generateToken.js     # JWT + random token + hash
│       │   ├── logger.js            # Winston logger
│       │   ├── seeder.js (320 dòng) # Full database seeder
│       │   └── sendEmail.js (8.4KB) # HTML email templates
│       └── validators/ (4)
│
├── ai_service/                      # 🤖 AI SERVICE (FastAPI)
│   ├── requirements.txt
│   ├── Dockerfile / Dockerfile.dev
│   └── app/
│       ├── main.py (74 dòng)        # FastAPI app + CORS
│       ├── core/config.py           # Pydantic Settings
│       ├── models/ (1)
│       ├── routers/chat.py (82 dòng) # POST /chat, GET /history
│       ├── schemas/ (2)
│       ├── services/
│       │   ├── stylist_engine.py (198 dòng) # Core AI logic
│       │   └── prompt_service.py
│       └── utils/ (1)
│
├── docker-compose.yml (162 dòng)    # 8 services (4 prod + 4 dev)
├── nginx.conf (60 dòng)             # Reverse proxy
├── setup-project.ps1 (17KB)         # PowerShell setup
├── CONTRIBUTING.md / README.md
└── .gitignore
```

---

## 4. SERVER — Backend Express.js

### 4.1 Entry Point (`server.js` — 188 dòng)

```
Luồng khởi tạo:
1. dotenv.config() → Load .env
2. Khởi tạo Express app
3. Security Middlewares:
   ├── helmet()                    # Security headers (XSS, MIME, clickjack)
   ├── cors({ origin: CLIENT_URL, credentials: true })
   ├── rateLimit: general = 1000 req/15min (dev), 100 (prod)
   └── authLimiter: 10 req/15min cho login/register/forgot/reset
4. Body Parsing: JSON + URLEncoded (limit 10MB)
5. Logging: Morgan ('dev' / 'combined')
6. Static Files: /uploads → express.static
7. Routes: /api/v1 → route aggregation
8. Error: notFound → errorHandler
9. Startup:
   ├── testConnection() → PostgreSQL ping
   ├── sequelize.sync({ alter: true }) → dev only
   ├── ALTER TYPE add PAYPAL enum
   ├── seedDefaultSettings()
   └── app.listen(PORT=5000)
10. Xử lý: unhandledRejection + uncaughtException → exit
```

### 4.2 Architecture Pattern: MVC + Service Layer

```
Request → Route → [Middleware] → Controller → Service → Model → DB
                                                  ↓
                                            JSON Response
```

- **Routes**: Định nghĩa endpoint, gắn middleware (auth, admin, validate)
- **Controllers**: Nhận req, parse params, gọi service, format response
- **Services**: 100% business logic, không biết về req/res
- **Models**: Sequelize definitions + associations
- **Utils**: AppError, catchAsync, generateToken, logger, sendEmail

### 4.3 Middleware Chi Tiết

| Middleware | Code Pattern | Logic |
|-----------|-------------|-------|
| `protect` | `Bearer token → verify → findByPk → check is_active → req.user` | JWT bắt buộc |
| `optionalAuth` | Same flow nhưng không throw error nếu không có token | JWT tùy chọn |
| `adminOnly` | `req.user.role !== 'ADMIN' → 403 Forbidden` | Chỉ admin |
| `errorHandler` | `AppError → statusCode + message; GenericError → 500` | Global error |
| `catchAsync` | `fn => (req,res,next) => fn(req,res,next).catch(next)` | Bọc async |
| `validate` | `validationResult(req) → 400 nếu có lỗi` | Input validation |

### 4.4 Key Services — Logic Chi Tiết

#### `auth.service.js` (246 dòng) — 6 functions:
- **register**: checkExist → bcrypt.hash(12) → User.create → generateAccessToken
- **login**: findByEmail → checkActive → bcrypt.compare → update last_login → token
- **forgotPassword**: find user → generateRandomToken → hashToken(SHA256) → save DB → sendEmail (không reveal email tồn tại)
- **resetPassword**: hashToken → findByResetToken → check expiry → bcrypt.hash → clear reset fields
- **changePassword**: findByPk → verify current → hash new → update
- **getUserById**: findByPk → return formatted user

#### `order.service.js` (316 dòng) — Transaction-based:

```javascript
createOrder(userId, items, orderData):
  1. BEGIN TRANSACTION
  2. Lock variants (SELECT FOR UPDATE) → tránh race condition
  3. Fetch variants + product info
  4. Check status === 'AVAILABLE' → throw nếu SOLD/RESERVED
  5. Tính: subtotal = Σ(sale_price || base_price + price_adjustment)
  6. totalAmount = subtotal + shippingFee - discountAmount
  7. Generate orderNumber: AA + YY + MM + random(1000-9999)
  8. Order.create + OrderItem.create[]
  9. Variant.update status → 'SOLD', sold_at = now
  10. COMMIT → return completeOrder with items

cancelOrder(orderId, userId):
  1. BEGIN TRANSACTION  
  2. Lock order row
  3. Check status === 'PENDING' → chỉ hủy đơn PENDING
  4. order.update status → 'CANCELLED'
  5. Variant.update status → 'AVAILABLE' (restore stock)
  6. COMMIT
```

#### `product.service.js` (314 dòng) — Filter/Sort/Paginate:

```
getProducts(options):
  Filters: category, brand (iLike), search (name|brand|desc), minPrice, maxPrice, variant status
  Sort: newest (default), price-asc, price-desc, oldest, popular (view_count)
  Pagination: page, limit(default 12), offset
  Include: variants (LEFT/INNER JOIN tùy filter)

getProductByIdOrSlug(identifier):
  Auto-detect UUID vs slug → findOne → increment view_count

getRelatedProducts(productId):
  Tìm cùng category HOẶC brand → ưu tiên cùng cả hai → limit 4

getNewArrivals(): created_at >= 14 ngày trước HOẶC is_new_arrival = true
getSaleProducts(): sale_price IS NOT NULL
getBestSellers(): ORDER BY view_count DESC
```

---

## 5. DATABASE — Schema Chi Tiết (18 Models)

### Quan hệ (Associations)

```
User ─1:N─→ Order ─1:N─→ OrderItem ─N:1─→ Variant ─N:1─→ Product
User ─1:N─→ Review ─N:1─→ Product
User ─1:N─→ ChatLog
Product ─1:N─→ Variant
Product ─1:N─→ Review
```

### Model: User
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID (PK) | auto UUIDV4 |
| email | STRING(255) | unique, isEmail |
| password_hash | STRING(255) | nullable (OAuth) |
| first_name / last_name | STRING(100) | nullable |
| phone | STRING(50) | nullable |
| avatar_url | STRING(500) | nullable |
| google_id / facebook_id | STRING(255) | unique, nullable |
| is_verified | BOOLEAN | default false |
| role | ENUM('ADMIN','CUSTOMER') | default 'CUSTOMER' |
| is_active | BOOLEAN | default true |
| reset_token / reset_token_expires | STRING/DATE | password reset |
| last_login_at | DATE | tracked on login |

### Model: Product
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| name | STRING(255) | required |
| slug | STRING(300) | unique, URL-friendly |
| brand | STRING(100) | required |
| description | TEXT | |
| base_price | DECIMAL(12,2) | Giá gốc (VND) |
| sale_price | DECIMAL(12,2) | Giá khuyến mãi (nullable) |
| category / subcategory | STRING(100) | Shoes/Outerwear/Pants/Tops/Bags/Dresses/Accessories |
| condition_text | STRING(50) | "9/10", "Like New" |
| authenticity_verified | BOOLEAN | Đã xác thực chính hãng |
| images | JSONB | Array URLs |
| tags | JSONB | Array strings |
| is_featured / is_new_arrival / is_active | BOOLEAN | Flags |
| view_count | INTEGER | default 0 |
| **Indexes**: slug(unique), brand, category, is_featured, is_active |

### Model: Variant — "Mỗi variant = 1 món đồ vật lý duy nhất"
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| product_id | UUID (FK) | → products |
| sku | STRING(50) | unique, format: BRA-123456-0001 |
| size | STRING(20) | XS/S/M/L/XL |
| color | STRING(50) | |
| material | STRING(100) | Leather/Cotton/Wool... |
| price_adjustment | DECIMAL(12,2) | Điều chỉnh giá từ base_price |
| status | **ENUM('AVAILABLE','RESERVED','SOLD')** | Lifecycle |
| reserved_at / reserved_by | DATE/UUID | Đặt trước |
| sold_at | DATE | Đã bán |
| **Indexes**: sku(unique), product_id, status, size, color |

### Model: Order
| Column | Type | Notes |
|--------|------|-------|
| order_number | STRING(20) | unique, auto-gen: AA2503xxxx |
| status | ENUM | PENDING→CONFIRMED→PROCESSING→SHIPPED→DELIVERED / CANCELLED / REFUNDED |
| payment_method | ENUM | COD, BANK_TRANSFER, CREDIT_CARD, MOMO, VNPAY, PAYPAL |
| payment_status | ENUM | PENDING, PAID, FAILED, REFUNDED |
| subtotal / shipping_fee / discount_amount / total_amount | DECIMAL(12,2) | |
| shipping_address | JSONB | {fullName, phone, address, city, district, ward, notes} |
| tracking_number | STRING(100) | Mã vận đơn |
| confirmed_at / shipped_at / delivered_at / cancelled_at | DATE | Timestamps |

### Model: Review
| Column | Type | Notes |
|--------|------|-------|
| rating | INTEGER | validate 1-5 |
| title | STRING(200) | optional |
| comment | TEXT | |
| images | JSONB | Review images |
| is_verified_purchase | BOOLEAN | Auto-check |
| is_approved | BOOLEAN | Admin moderation |
| helpful_count | INTEGER | "Was this helpful?" |
| **Unique**: (user_id, product_id) — 1 review/user/product |

### Model: Coupon
| Column | Type | Notes |
|--------|------|-------|
| code | STRING(50) | unique |
| type | ENUM('PERCENTAGE','FIXED_AMOUNT') | |
| value | DECIMAL(10,2) | % hoặc VND |
| min_order_amount | DECIMAL(12,2) | Đơn tối thiểu |
| max_discount_amount | DECIMAL(12,2) | Giới hạn giảm (cho %) |
| max_uses / max_uses_per_user | INTEGER | Giới hạn sử dụng |
| starts_at / expires_at | DATE | Thời hạn |
| applies_to | ENUM('ALL','SPECIFIC_PRODUCTS','SPECIFIC_CATEGORIES') | |
| product_ids / category_ids | JSONB | Target arrays |

### Các Model Khác (Tóm tắt)
| Model | Chức năng chính |
|-------|----------------|
| **OrderItem** | product_name, variant_size, variant_color, price, quantity |
| **Wishlist** | user_id + product_id (favorite) |
| **CouponUsage** | user_id + coupon_id + order_id (tracking) |
| **Address** | Địa chỉ giao hàng lưu trữ (fullName, phone, address...) |
| **Banner** | Quảng cáo (title, image_url, link, position, is_active) |
| **Blog** | Bài viết (title, slug, content, thumbnail, category) |
| **ChatLog** | Lịch sử chat AI (session_id, message, response, metadata) |
| **Newsletter** | Email đăng ký (email, is_active) |
| **SystemPrompt** | Prompt AI (key, content, is_active, version) |
| **SiteSettings** | Cấu hình toàn site (9KB — rất chi tiết) |
| **Popup** | Marketing popups (content, trigger, frequency, is_active) |
| **AbandonedCart** | Giỏ hàng bỏ dở (user_id, items JSONB, last_activity) |

---

## 6. API ENDPOINTS — Bảng Đầy Đủ (120+ endpoints)

### Auth `/api/v1/auth`
| Method | Path | Auth | Middleware | Mô tả |
|--------|------|------|-----------|-------|
| POST | `/register` | Public | registerValidator | Đăng ký |
| POST | `/login` | Public | loginValidator | Đăng nhập |
| POST | `/forgot-password` | Public | forgotPasswordValidator | Quên MK |
| POST | `/reset-password` | Public | resetPasswordValidator | Reset MK |
| GET | `/me` | protect | — | Lấy user hiện tại |
| POST | `/change-password` | protect | changePasswordValidator | Đổi MK |
| POST | `/google` | Public | — | Google OAuth login |
| POST | `/facebook` | Public | — | Facebook OAuth login |

### Products `/api/v1/products` (Public)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/` | Danh sách SP + filter (category/brand/price/sort/search) |
| GET | `/featured` | SP nổi bật (limit param) |
| GET | `/new-arrivals` | SP mới (14 ngày, page param) |
| GET | `/best-sellers` | SP bán chạy (by view_count) |
| GET | `/sale` | SP đang giảm giá |
| GET | `/categories` | Danh sách categories + count |
| GET | `/brands` | Danh sách brands + count |
| GET | `/:id` | Chi tiết SP (UUID hoặc slug) |
| GET | `/:id/related` | SP liên quan (cùng category/brand) |

### Orders `/api/v1/orders` (protect)
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/` | Tạo đơn hàng (checkout) |
| GET | `/` | Đơn hàng của user (page/limit/status) |
| POST | `/check-availability` | Kiểm tra variant còn hàng |
| GET | `/:id` | Chi tiết đơn |
| POST | `/:id/cancel` | Hủy đơn (chỉ PENDING) |

### Payments `/api/v1/payments`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/vnpay/create` | protect | Tạo VNPay payment URL |
| GET | `/vnpay/return` | Public | VNPay redirect callback |
| GET | `/vnpay/ipn` | Public | VNPay server-to-server |
| POST | `/momo/create` | protect | Tạo MoMo payment |
| GET | `/momo/return` | Public | MoMo redirect callback |
| POST | `/momo/ipn` | Public | MoMo IPN callback |
| POST | `/paypal/create` | protect | Tạo PayPal order |
| GET | `/paypal/return` | Public | PayPal capture payment |
| POST | `/paypal/webhook` | Public | PayPal webhook |

### Admin `/api/v1/admin` (protect + adminOnly)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/stats` | Dashboard stats |
| GET | `/revenue/monthly` | Biểu đồ doanh thu |
| GET/PATCH | `/orders`, `/orders/:id/status` | Quản lý đơn hàng |
| GET/PUT | `/system-prompts/:key` | Quản lý AI prompt |
| CRUD | `/products`, `/products/:id` | Quản lý sản phẩm |
| CRUD | `/products/:id/variants` | Quản lý variants |
| GET/PATCH | `/users`, `/users/:id/status` | Quản lý user |
| CRUD | `/coupons` | Quản lý mã giảm |
| GET/PATCH/DELETE | `/reviews` | Moderation |
| CRUD | `/banners`, `/blogs`, `/popups` | CMS |
| GET/PUT | `/settings` | Site settings |
| GET/PATCH | `/abandoned-carts` | Giỏ bỏ dở |
| POST | `/upload/product-images` | Upload (max 5 files) |

### Các Route Khác
| Group | Endpoints |
|-------|----------|
| **Wishlist** (protect) | GET `/`, POST `/`, DELETE `/:productId`, GET `/check/:productId` |
| **Reviews** | GET `/products/:id/reviews`, GET `/summary`, POST `/helpful`, POST create, PUT update, DELETE |
| **Addresses** (protect) | CRUD + GET `/default`, PATCH `/:id/default` |
| **Chat** (optionalAuth) | POST `/`, GET `/greeting`, GET `/health`, GET `/history/:sessionId` |
| **Users** (protect) | GET/PUT `/profile`, PUT `/password`, GET `/orders` |
| **Coupons** | POST `/validate` (optionalAuth) |
| **Banners** | GET `/` (public) |
| **Blogs** | GET `/`, GET `/categories`, GET `/:slug` |
| **Contact** | POST `/` |
| **Newsletter** | POST `/subscribe`, POST `/unsubscribe` |
| **Locations** | GET `/provinces`, GET `/districts/:province`, GET `/search` |
| **Shipping** | POST `/calculate`, GET `/rates` |
| **Settings** | GET `/`, GET `/product-attributes` |
| **Health** | GET `/health` |

---

## 7. CLIENT — Frontend Nuxt.js 3

### 7.1 Nuxt Config Highlights
- **SSR**: Enabled (mặc định)
- **API Proxy**: Nitro routeRules proxy `/api/**` → `http://localhost:5000`
- **i18n**: Lazy loading, no_prefix strategy, default 'vi', browser detection
- **Pinia**: Persisted state (localStorage)
- **HMR**: Polling mode cho Docker on Windows

### 7.2 Auth Store (`stores/auth.ts` — 209 dòng)
```typescript
State: { user, token, isLoading, isHydrated }
Getters:
  isAuthenticated: token && user (hoặc token && !isHydrated để tránh flash)
  isAdmin: user.role === 'ADMIN'
  fullName: firstName + lastName
Actions:
  login(email, password) → $fetch → set user+token → localStorage
  register(data) → $fetch → set user+token → localStorage  
  logout() → clear state + localStorage → navigateTo('/', {external: true})
  fetchUser() → GET /auth/me → update user (401 → logout)
  init() → check localStorage → fetchUser nếu cần
Persist: ['token', 'user']
```

### 7.3 Cart Store (`stores/cart.ts` — 239 dòng)
```typescript
State: { items: CartItem[], isLoading, appliedCoupon }
// CartItem = { id(variantId), productId, productName, brand, image, size, color, price, addedAt }
Getters: itemCount, subtotal, formattedSubtotal, isEmpty, variantIds, checkoutItems
Actions:
  addToCart(item) → check exists (unique item!) → push
  removeFromCart(variantId) → splice
  clearCart()
  setCoupon / clearCoupon
  validateAvailability() → POST /orders/check-availability → remove unavailable
  checkout(orderData) → POST /orders → clearCart on success
Persist: true (toàn bộ state)
```

### 7.4 useApi Composable (`composables/useApi.ts` — 95 dòng)
```typescript
// Generic HTTP client, tự inject JWT token
const { get, post, put, patch, del } = useApi()
// Mỗi method: $fetch(apiUrl + endpoint, { method, headers: getHeaders(), body })
// getHeaders(): lấy token từ authStore.token || localStorage
```

### 7.5 useCurrency Composable — VND↔USD
```typescript
const EXCHANGE_RATE = 25000 // 1 USD = 25,000 VND
// Giá trong DB lưu VND
// formatPrice(priceInVND):
//   VND mode → Intl.NumberFormat('vi-VN', {currency:'VND'})
//   USD mode → priceInVND / 25000 → Intl.NumberFormat('en-US', {currency:'USD'})
// Persist: localStorage key 'aura_currency'
```

---

## 8. AI SERVICE — FastAPI

### 8.1 Architecture
```
main.py → FastAPI app
├── CORS: localhost:3000, 5000, BACKEND_URL
├── Router: /api/v1/chat
└── Endpoints: POST /chat, GET /chat/history/{session_id}
```

### 8.2 StylistEngine (`stylist_engine.py` — 198 dòng)
```python
class StylistEngine:
    __init__():
        client = AsyncOpenAI(api_key) if key else None (→ demo mode)
        model = settings.OPENAI_MODEL
        sessions = {}  # In-memory: {session_id: {messages:[], last_access}}
        SESSION_TTL = 30 minutes

    process_message(message, session_id, user_id, context, system_prompt):
        1. _cleanup_expired_sessions()
        2. Init/update session
        3. Append user message to history
        4. If no API key → _get_demo_response() (keyword matching)
        5. Build prompt: system_prompt (từ DB) hoặc default + context
        6. Messages = system + last 10 history
        7. openai.chat.completions.create(model, messages, max_tokens=500, temp=0.7)
        8. Append AI response to history
        9. Return {message, metadata: {tokens_used, model}}

    _get_demo_response(message):
        # Keyword matching (hello/bag/dress/shoe/price/consign)
        # Trả response mẫu khi không có OpenAI key
```

### 8.3 Chat API Schema
```python
ChatRequest:  message(1-2000 chars), session_id?, user_id?, context?, system_prompt?
ChatResponse: success, message, session_id, metadata?
```

**Điểm đặc biệt**: Admin có thể thay đổi system prompt từ Dashboard → Node.js fetch từ DB → gửi kèm mỗi request đến AI Service → AI thay đổi hành vi ngay lập tức **không cần deploy lại**.

---

## 9. Authentication & Security

### Luồng JWT
```
Register/Login → bcrypt verify → generateAccessToken({id, email, role})
→ Client lưu: localStorage('token') + Pinia persisted state
→ Mỗi request: Authorization: Bearer <token>
→ Server: protect middleware → verifyAccessToken → findByPk → check is_active → req.user
```

### Password Reset Flow
```
forgotPassword → generateRandomToken(32 bytes hex)
→ hashToken(SHA256) → save hashed to DB + expiry(1h)
→ sendPasswordResetEmail(plain token)
→ User click link → resetPassword(plain token)
→ hashToken(plain) → compare with DB → update password → clear token
```

### Security Layers (Tóm tắt)
| Layer | Mechanism |
|-------|-----------|
| HTTP Headers | Helmet (XSS, MIME, Clickjack, HSTS) |
| CORS | Chỉ CLIENT_URL |
| Rate Limit | General: 100/15min, Auth: 10/15min |
| Input Validation | express-validator + validators/ |
| SQL Injection | Sequelize ORM (parameterized) |
| XSS (Client) | useSanitizeHtml composable |
| Password | bcrypt 12 rounds |
| Auth | JWT (stateless) |
| Authorization | Role-based (ADMIN/CUSTOMER) |

---

## 10. Payment Integrations

### Luồng chung
```
1. User chọn payment method tại Checkout
2. Client → POST /orders (tạo order, status: PENDING)
3. Client → POST /payments/{gateway}/create
4. Server tạo payment URL → redirect user đến cổng thanh toán
5. User thanh toán xong → redirect về /payments/{gateway}/return
6. Server verify → update order: payment_status='PAID', status='CONFIRMED'
7. Cổng thanh toán gửi IPN/webhook → server verify signature → update order
```

### VNPay
- **USD→VND**: `amount × 24000 × 100` (VNPay yêu cầu đơn vị nhỏ nhất)
- **Verify**: So sánh hmac signature, check amount, check đã paid chưa

### MoMo
- **USD→VND**: `Math.round(amount × 24000)`
- **Return**: resultCode === '0' → success
- **Bonus**: Trả về payUrl + qrCodeUrl + deeplink

### PayPal
- **Luồng**: createPayment → user approve → capturePayment
- **Webhook**: CHECKOUT.ORDER.APPROVED → auto capture
- **Tiền tệ**: USD (không cần convert)

---

## 11. Deployment & Infrastructure

### Docker Compose — 8 Services

| Service | Image | Port | Mode |
|---------|-------|------|------|
| postgres | postgres:15-alpine | 5432 | Shared |
| server | ./server/Dockerfile | 5000 (expose) | Prod |
| ai-service | ./ai_service/Dockerfile | 8001 (expose) | Prod |
| client | ./client/Dockerfile | 3000 (expose) | Prod |
| nginx | nginx:alpine | **80** | Prod |
| server-dev | Dockerfile.dev | 5000 + volumes | Dev |
| ai-service-dev | Dockerfile.dev | 8001 + volumes | Dev |
| client-dev | Dockerfile.dev | 3000 + volumes + HMR | Dev |

### Nginx Routing
```
Port 80 →
  /api/**  → server:5000 (WebSocket support)
  /ai/**   → ai-service:8001 (URL rewrite: strip /ai prefix)
  /*       → client:3000 (Nuxt SSR)
```

### DB Config
| Env | Pool Max | Pool Min | Logging |
|-----|----------|----------|---------|
| dev | 5 | 0 | console.log |
| test | — | — | false |
| prod | 20 | 5 | false + SSL optional |

---

## 12. Design System

### Tailwind Config (`tailwind.config.js` — 127 dòng)

**Colors (Ralph Lauren Inspired)**:
```
aura-black: #0A0A0A    aura-white: #FFFFFF
aura-cream: #FAF9F6    aura-ivory: #FFFFF0
accent-gold: #D4AF37   accent-burgundy: #722F37
accent-navy: #041E42   accent-olive: #3C3C2E
accent-tan: #D2B48C
neutral: 50-900 scale
```

**Typography**: Playfair Display (serif) + Inter (sans-serif)
- display-1: 4.5rem, display-2: 3.75rem
- heading 1-4: 3rem → 1.5rem
- body-lg/body/body-sm/caption

**Shadows**: soft, medium, elevated, card, card-hover
**Animations**: fadeIn(0.5s), slideUp(0.4s), slideDown(0.4s)
**Aspect Ratios**: product(3/4), hero(16/9), square(1/1)
**Container**: max 1280px (container), 900px (content), 600px (narrow)

---

## 13. Seed Data (`seeder.js` — 320 dòng)

### Dữ liệu tạo sẵn
```
Chạy: npm run seed (sync force:true → XÓA toàn bộ DB → tạo lại)

1. Users (12):
   - Admin: admin@aura.com / admin123
   - Customer: customer@aura.com / 123456
   - 10 random customers (Faker.js)

2. System Prompts (2):
   - STYLIST_PERSONA: AI personality definition
   - GREETING_MESSAGE: Initial chat greeting

3. Products (20):
   - Brands: Rick Owens, Acronym, CDG, Yohji, Issey Miyake, Maison Margiela...
   - Categories: Shoes, Outerwear, Pants, Tops, Bags, Dresses, Accessories
   - Prices: 8.750.000₫ → 75.000.000₫ (luxury range)
   - Mỗi product có 1 variant (resell model)
   - 80% AVAILABLE, 20% SOLD
   - 4 đầu tiên is_featured = true

4. Orders (50):
   - Random statuses, payment methods, dates (12 tháng qua)
   - Vietnamese shipping addresses (HCM, HN, DN, CT)
```

---

## 14. Đánh Giá Chi Tiết & Nhận Xét Senior Dev

### ✅ Điểm Mạnh

1. **Kiến trúc sạch**: MVC + Service Layer tách biệt rõ ràng, dễ scale
2. **Transaction support**: Order creation dùng Sequelize transaction + row locking
3. **Security đầy đủ**: Helmet, CORS, rate limiting (riêng cho auth), bcrypt 12 rounds
4. **Unique Item model**: Phù hợp resell — mỗi variant = 1 món duy nhất, status lifecycle AVAILABLE→RESERVED→SOLD
5. **4 cổng thanh toán**: VNPay + MoMo + PayPal + VietQR — cover cả nội địa và quốc tế
6. **Dynamic AI prompt**: Admin thay đổi chatbot behavior realtime qua DB, không cần deploy
7. **i18n hoàn chỉnh**: EN/VI với lazy loading, no_prefix strategy
8. **Docker dual-mode**: Prod (Nginx reverse proxy) + Dev (hot reload + volumes)
9. **catchAsync pattern**: Không bao giờ quên try-catch trong controller
10. **Error handling chuẩn**: Custom AppError class → global errorHandler

### ⚠️ Điểm Cần Cải Thiện

1. **Không có unit tests**: Không thấy test folder — rủi ro regression cao
2. **AI session in-memory**: Mất toàn bộ chat history khi restart AI service
3. **Order number collision**: Random 4 digits → possible duplicate ở volume cao
4. **SQL injection risk**: `product.service.js` line 215 dùng string interpolation trong SQL literal
5. **Thiếu Redis/caching**: Hot data (products, categories) query DB mỗi request
6. **Chưa có CI/CD**: Không thấy GitHub Actions hoặc pipeline
7. **Thiếu API rate limit granular**: Chỉ có general + auth, chưa có per-endpoint
8. **Password policy**: Chưa validate complexity (min length, uppercase, special char)
9. **Không có refresh token**: Chỉ có access token, hết hạn phải login lại
10. **Hardcoded exchange rate**: USD/VND = 25000 cứng trong code

### 📊 Thống Kê Tổng Quan

| Metric | Giá trị |
|--------|---------|
| **Tổng files code** | ~268 files |
| **Database Models** | 18 models |
| **API Controllers** | 19 controllers |
| **API Endpoints** | ~120 endpoints |
| **Business Services** | 27 services |
| **Client Pages** | 48 trang |
| **Vue Components** | 43 components |
| **Composables** | 11 |
| **Pinia Stores** | 6 |
| **Payment Gateways** | 4 (MoMo, VNPay, PayPal, VietQR) |
| **Languages** | 2 (EN, VI) |
| **Docker Services** | 8 (4 prod + 4 dev) |
| **Server Lines (est.)** | ~8,000+ dòng JS |
| **Client Lines (est.)** | ~12,000+ dòng Vue/TS |
| **AI Service Lines** | ~500 dòng Python |

---

> 📝 **Ghi chú cuối**: Đây là bản phân tích chi tiết nhất từ góc nhìn Senior Developer. File này có thể dùng để:
> - Onboard thành viên mới vào dự án
> - Tham khảo khi quay lại dự án sau thời gian dài
> - Chuẩn bị cho bảo vệ khóa luận (giải thích kiến trúc & kỹ thuật)
> - Debug nhanh bằng cách tra cứu endpoint/model/service tương ứng
