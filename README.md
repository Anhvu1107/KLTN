# AURA ARCHIVE

> Luxury Resell & Consignment Fashion E-commerce Platform

A full-stack monorepo featuring a Nuxt.js 3 frontend, Express.js backend, and Python FastAPI AI service.

---

## 🛠️ Tech Stack

| Service | Technology | Port |
|---------|------------|------|
| **Client** | Nuxt.js 3 + Vue 3 + Tailwind CSS | 3000 |
| **Server** | Express.js + PostgreSQL + Sequelize | 5000 |
| **AI Service** | FastAPI + LangChain + Gemini | 8001 |
| **Database** | PostgreSQL 15 | 5432 |

---

## ✨ Features (50+)

### 🛒 E-commerce Core
- Product catalog with variants (size/color)
- Shopping cart with coupon support
- Multi-step checkout
- Order management & tracking
- Wishlist

### 🔍 Search & Filter
- **AJAX Search** - Real-time suggestions with images
- Price range, size, color filters
- Category & brand filters

### 💳 Payments
- **VNPay** gateway integration
- **VietQR** bank transfer QR codes
- Payment success/failed pages

### 👤 User Features
- JWT Authentication
- **Google OAuth** login
- **Facebook OAuth** login
- Address book management
- Order history

### 🤖 AI Chatbot
- Gemini-powered AI assistant
- Product recommendations
- FAQ handling

### 📱 Modern UI/UX
- **Quick View** modal
- **Skeleton Loading**
- **Mega Menu** with images
- **Mobile Buy Button** (fixed bottom)
- Image zoom on hover
- Responsive design

### 🔧 Admin Dashboard (12 tabs)
| Dashboard | Orders | Products | Users |
|-----------|--------|----------|-------|
| **Coupons** | **Reviews** | **Banners** | **Blogs** |
| **Popups** | **Abandoned Carts** | **Settings** | **AI Config** |

### 📧 Marketing
- Newsletter subscriptions
- Popup manager with scheduling
- Abandoned cart recovery
- Email notifications

---

## 📁 Project Structure

```
KLTN/
├── client/                 # Nuxt.js 3 Frontend
│   ├── components/         # 36+ Vue components
│   ├── pages/              # Route pages
│   ├── stores/             # Pinia stores
│   └── locales/            # i18n (en/vi)
├── server/                 # Express.js Backend
│   ├── src/
│   │   ├── models/         # 19 Sequelize models
│   │   ├── controllers/    # API handlers
│   │   ├── services/       # Business logic
│   │   └── routes/         # API routes
│   └── .env
├── ai_service/             # Python FastAPI AI
│   ├── app/
│   └── requirements.txt
├── docker-compose.yml      # Production
├── docker-compose.dev.yml  # Development (PostgreSQL only)
└── README.md
```

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone project
git clone https://github.com/Anhvu1107/KLTN.git
cd KLTN

# Start PostgreSQL
docker-compose -f docker-compose.dev.yml up -d

# Install & run server
cd server
npm install
npm run dev

# Install & run client (new terminal)
cd client
npm install
npm run dev

# Open: http://localhost:3000
```

### Option 2: Full Docker Stack

```bash
docker-compose up -d --build
# Open: http://localhost:3000
```

---

## ⚙️ Environment Variables

### Server (.env)
```env
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aura_archive
DB_USER=postgres
DB_PASSWORD=aura_secret_2024

# Auth
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
FACEBOOK_APP_ID=your_facebook_app_id

# Payments
VNPAY_TMN_CODE=your_vnpay_code
VNPAY_HASH_SECRET=your_vnpay_secret
VNPAY_RETURN_URL=http://localhost:3000/payment/vnpay-return

# AI Service
AI_SERVICE_URL=http://localhost:8001
```

### Client (.env)
```env
NUXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NUXT_PUBLIC_AI_SERVICE_URL=http://localhost:8001
NUXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### AI Service (.env)
```env
GEMINI_API_KEY=your_gemini_api_key
```

---

## � API Endpoints

### Public APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | List products |
| GET | `/products/:id` | Product detail |
| GET | `/products/sale` | Sale products |
| GET | `/blogs` | Blog posts |
| POST | `/auth/login` | Login |
| POST | `/auth/register` | Register |
| POST | `/auth/google` | Google OAuth |

### Protected APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/profile` | Get profile |
| GET | `/users/orders` | Order history |
| POST | `/orders` | Create order |
| POST | `/payments/vnpay/create` | VNPay payment |

### Admin APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard` | Stats |
| GET | `/admin/orders` | All orders |
| GET | `/admin/products` | All products |
| GET | `/admin/settings` | Site settings |

---

## 🐳 Docker Commands

```bash
# Development (PostgreSQL only)
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml down

# Production (Full stack)
docker-compose up -d --build
docker-compose logs -f
docker-compose down

# Database backup
docker exec aura-postgres pg_dump -U postgres aura_archive > backup.sql
```

---

## � License

MIT License - See [LICENSE](LICENSE) for details.

---

## 👨‍💻 Author

**Anhvu1107** - KLTN Project 2026
