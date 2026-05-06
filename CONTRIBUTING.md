# Hướng dẫn đóng góp

> Cập nhật: **2026-05-06**
> Kiến trúc hiện tại: **Nuxt 3 client + Express.js server + PostgreSQL**. AI Stylist đã tích hợp trong backend Node.js, không còn cần chạy FastAPI/Python service riêng.

---

## 1. Bắt đầu

### 1.1 Clone project

```bash
git clone git@github.com:Anhvu1107/KLTN.git
cd KLTN
```

### 1.2 Cài dependencies

Client:

```bash
cd client
npm install
```

Server:

```bash
cd ../server
npm install
```

Không cần `cd ai_service`, `pip install` hoặc `uvicorn` cho kiến trúc hiện tại.

---

## 2. Database

Khuyến nghị dùng Docker:

```bash
docker-compose up postgres -d
```

Kiểm tra:

```bash
docker exec -it aura-postgres psql -U postgres -d aura_archive -c "SELECT 1;"
```

Database mặc định:

| Key | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `aura_archive` |
| User | `postgres` |
| Password | `aura_secret_2024` nếu không override `DB_PASSWORD` |

---

## 3. Cấu hình môi trường

Server:

```bash
cd server
copy .env.example .env
```

Client:

```bash
cd ../client
copy .env.example .env
```

Các nhóm biến cần chú ý:

- Database: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
- Auth: `JWT_SECRET`, `JWT_EXPIRES_IN`.
- Client: `NUXT_PUBLIC_API_URL`, `NUXT_PUBLIC_SOCKET_URL`, `NUXT_PUBLIC_IMAGE_BASE_URL`.
- AI: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_LIVE_MODEL`, `OPENAI_API_KEY`, `CHATBOT_MODE`.
- Payment: `MOMO_*`, `VNPAY_*`, `PAYPAL_*`.
- Email: `SMTP_*`, `RESEND_*`.

Không commit file `.env`.

---

## 4. Seed database

```bash
cd server
npm run seed
```

Tài khoản demo:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@aura.com` | `admin123` |
| Customer | `customer@aura.com` | `123456` |

---

## 5. Chạy development

Terminal 1 - Server:

```bash
cd server
npm run dev
```

Terminal 2 - Client:

```bash
cd client
npm run dev
```

URL:

| Mục | URL |
|---|---|
| Frontend | `http://localhost:3000` |
| API | `http://localhost:5000/api/v1` |
| API docs | `http://localhost:5000/docs` |
| Health | `http://localhost:5000/health` |

---

## 6. Chạy bằng Docker Compose

Development:

```bash
docker-compose up postgres server-dev client-dev
```

Production-like:

```bash
docker-compose up postgres server client nginx
```

Production-like stack expose:

- Frontend qua Nginx: `http://localhost`
- API qua Nginx: `http://localhost/api/v1`
- Uploads qua Nginx: `http://localhost/uploads`
- Socket.IO qua Nginx: `http://localhost/socket.io/`

---

## 7. Git workflow

### 7.1 Cấu trúc nhánh

```text
main
└── dev
    └── feature/ten-tinh-nang
```

Quy tắc:

- Không push trực tiếp vào `main` nếu không được yêu cầu rõ.
- Tạo branch riêng cho feature/fix.
- Pull code mới trước khi tạo branch.
- Commit nhỏ, rõ nội dung.
- Tạo PR để review khi làm việc nhóm.

### 7.2 Đặt tên branch

| Loại | Format | Ví dụ |
|---|---|---|
| Feature | `feature/ten` | `feature/admin-chat` |
| Fix | `fix/ten` | `fix/payment-callback` |
| Docs | `docs/ten` | `docs/update-srs` |
| Codex | `codex/ten` | `codex/update-project-docs` |

### 7.3 Commit message

| Prefix | Ý nghĩa | Ví dụ |
|---|---|---|
| `feat:` | Tính năng mới | `feat: add admin chat page` |
| `fix:` | Sửa lỗi | `fix: handle vnpay callback failure` |
| `docs:` | Tài liệu | `docs: update project architecture` |
| `style:` | UI/CSS | `style: refine product card` |
| `refactor:` | Refactor | `refactor: split payment service` |
| `chore:` | Việc phụ trợ | `chore: update env example` |

---

## 8. Checklist trước khi push/PR

- Chạy phần app liên quan nếu thay đổi code.
- Chạy lint nếu sửa frontend/backend:
  - `cd client && npm run lint`
  - `cd server && npm run lint`
- Kiểm tra `git diff --check`.
- Không stage `.env`, log lớn, build output hoặc file tạm.
- Với thay đổi docs, kiểm tra README/SRS/PROJECT_ANALYSIS không còn mô tả `ai_service` FastAPI cũ.

---

## 9. Ghi chú hiện trạng

- AI chat/voice nằm trong `server/src/services/ai.service.js`, `server/src/services/ai/*`, `server/src/services/voice.service.js`.
- API AI đi qua `/api/v1/chat/*`.
- Nginx không cần proxy `/ai` sang service riêng.
- `setup-project.ps1` là script scaffold ban đầu, không nên xem là nguồn sự thật kiến trúc hiện tại.
