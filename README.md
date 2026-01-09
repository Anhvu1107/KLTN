# AURA ARCHIVE

> Luxury Resell & Consignment Fashion E-commerce Platform

A full-stack monorepo featuring a Nuxt.js 3 frontend, Express.js backend, and Python FastAPI AI service.

---

## 🛠️ Tech Stack

| Service | Technology | Port |
|---------|------------|------|
| **Client** | Nuxt.js 3 + Vue 3 + Tailwind CSS | 3000 |
| **Server** | Express.js + PostgreSQL + Sequelize | 5000 |
| **AI Service** | FastAPI + LangChain + OpenAI | 8000 |

---

## 📁 Project Structure

```
KLTN/
├── client/           # Nuxt.js 3 Frontend
│   ├── pages/        # Route pages
│   ├── components/   # Vue components
│   ├── stores/       # Pinia stores
│   ├── locales/      # i18n translations (en.json, vi.json)
│   └── assets/       # CSS, images
├── server/           # Express.js Backend
│   ├── src/
│   │   ├── models/       # Sequelize models
│   │   ├── controllers/  # Route handlers
│   │   ├── services/     # Business logic
│   │   ├── routes/       # API routes
│   │   └── middlewares/  # Auth, validation
│   └── .env              # Environment config
├── ai_service/       # Python FastAPI AI
│   ├── app/
│   │   ├── main.py       # FastAPI entry
│   │   ├── services/     # AI logic
│   │   └── prompts/      # LangChain prompts
│   └── requirements.txt
└── README.md
```

---

## 🚀 Quick Start (Cho người mới)

### 1. Yêu cầu hệ thống

- **Node.js** 18+ (https://nodejs.org)
- **Python** 3.10+ (https://python.org)
- **PostgreSQL** 14+ (https://postgresql.org)
- **Git** (https://git-scm.com)

### 2. Clone project

```bash
git clone git@github.com:Anhvu1107/KLTN.git
cd KLTN
```

### 3. Cài đặt PostgreSQL Database

```sql
-- Mở pgAdmin hoặc psql, tạo database:
CREATE DATABASE aura_archive;
CREATE USER aura_user WITH ENCRYPTED PASSWORD 'aura_password_2024';
GRANT ALL PRIVILEGES ON DATABASE aura_archive TO aura_user;
```

### 4. Cấu hình môi trường

**Server (.env):**
```bash
cd server
copy .env.example .env
# Mở .env và chỉnh sửa:
# - DATABASE_URL
# - JWT_SECRET
# - AI_SERVICE_URL
```

**Client (.env):**
```bash
cd client
copy .env.example .env
# Mở .env và chỉnh sửa:
# - NUXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

**AI Service (.env):**
```bash
cd ai_service
copy .env.example .env
# Mở .env và chỉnh sửa:
# - OPENAI_API_KEY=your_openai_key
```

### 5. Cài đặt dependencies

```bash
# Terminal 1 - Client
cd client
npm install

# Terminal 2 - Server  
cd server
npm install

# Terminal 3 - AI Service
cd ai_service
pip install -r requirements.txt
```

### 6. Seed database (chạy 1 lần)

```bash
cd server
npm run seed
```

Tạo sẵn:
- Admin: `admin@aura.com` / `admin123`
- Customer: `customer@aura.com` / `123456`
- 10 random customers
- 20 sample products
- 15 sample orders

### 7. Chạy development servers

```bash
# Terminal 1 - Client (http://localhost:3000)
cd client
npm run dev

# Terminal 2 - Server (http://localhost:5000)
cd server
npm run dev

# Terminal 3 - AI Service (http://localhost:8000)
cd ai_service
uvicorn app.main:app --reload --port 8000
```

---

## 📋 Features

### Customer
- [x] Shop page với filter (brand, category, price)
- [x] Product detail page
- [x] Cart & Checkout
- [x] User account (profile, orders, wishlist)
- [x] i18n song ngữ (EN/VI)
- [x] AI Stylist chatbot

### Admin
- [x] Dashboard với stats & charts
- [x] Order management (status updates)
- [x] Product management (CRUD)
- [x] User management (view, activate/deactivate)
- [x] AI config (edit system prompts)

---

## 🔑 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Đăng ký |
| POST | `/api/v1/auth/login` | Đăng nhập |
| GET | `/api/v1/products` | Danh sách sản phẩm |
| POST | `/api/v1/orders` | Tạo đơn hàng |
| GET | `/api/v1/wishlist` | Wishlist |
| GET | `/api/v1/admin/stats` | Admin stats |

---

## 🎨 Design System

- **Typography**: Playfair Display (serif) + Inter (sans)
- **Colors**: Black `#0A0A0A`, White `#FFFFFF`, Cream `#FAF9F6`, Gold `#D4AF37`, Burgundy `#722F37`
- **Style**: Ralph Lauren-inspired luxury aesthetic

---

## 📞 Liên hệ

- GitHub: [@Anhvu1107](https://github.com/Anhvu1107)
