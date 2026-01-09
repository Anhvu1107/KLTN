# Hướng dẫn đóng góp (Contributing Guide)

## 🚀 Bắt đầu

### 1. Clone project
```bash
git clone https://github.com/Anhvu1107/KLTN.git
cd KLTN
```

### 2. Cài đặt dependencies
```bash
# Client
cd client && npm install

# Server
cd ../server && npm install

# AI Service
cd ../ai_service && pip install -r requirements.txt
```

### 3. Cấu hình môi trường
```bash
# Copy file .env.example thành .env trong mỗi thư mục
# Chỉnh sửa các giá trị phù hợp
```

### 4. Seed database (lần đầu)
```bash
cd server && npm run seed
```

---

## 🌿 Git Workflow

### Cấu trúc nhánh
```
main     ← Production (không code trực tiếp)
└── dev  ← Development (merge code vào đây)
      └── feature/xxx  ← Nhánh riêng của bạn
```

### Quy trình làm việc

#### Bước 1: Tạo nhánh mới từ dev
```bash
git checkout dev
git pull origin dev          # Cập nhật code mới nhất
git checkout -b feature/ten-tinh-nang
```

**Đặt tên nhánh:**
- `feature/ten-tinh-nang` - Tính năng mới
- `fix/ten-loi` - Sửa bug
- `hotfix/ten-loi` - Sửa lỗi khẩn cấp

#### Bước 2: Code và commit
```bash
git add .
git commit -m "feat: add checkout page"
```

**Commit message format:**
- `feat:` - Tính năng mới
- `fix:` - Sửa bug
- `docs:` - Cập nhật docs
- `style:` - CSS/UI changes
- `refactor:` - Refactor code

#### Bước 3: Push lên GitHub
```bash
git push origin feature/ten-tinh-nang
```

#### Bước 4: Tạo Pull Request
1. Vào GitHub → Pull Requests → New Pull Request
2. Base: `dev` ← Compare: `feature/ten-tinh-nang`
3. Điền title và mô tả
4. Assign reviewer
5. Create Pull Request

#### Bước 5: Review và Merge
- Owner review code
- Approve và Merge vào `dev`
- Delete branch sau khi merge

---

## 📁 Cấu trúc thư mục

```
client/
├── pages/           # Route pages (auto-routing)
├── components/      # Vue components
│   └── layout/      # Header, Footer
├── stores/          # Pinia stores
├── locales/         # i18n (en.json, vi.json)
└── assets/css/      # Tailwind CSS

server/
├── src/
│   ├── models/      # Sequelize models
│   ├── controllers/ # Request handlers
│   ├── services/    # Business logic
│   ├── routes/      # API routes
│   └── middlewares/ # Auth, validation
└── .env

ai_service/
├── app/
│   ├── main.py      # FastAPI entry
│   └── services/    # AI logic
└── requirements.txt
```

---

## 🔧 Chạy development

```bash
# Terminal 1 - Client (http://localhost:3000)
cd client && npm run dev

# Terminal 2 - Server (http://localhost:5000)
cd server && npm run dev

# Terminal 3 - AI Service (http://localhost:8000)
cd ai_service && uvicorn app.main:app --reload --port 8000
```

---

## 🔑 Tài khoản test

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@aura.com | admin123 |
| Customer | customer@aura.com | 123456 |

---

## ⚠️ Lưu ý quan trọng

1. **KHÔNG commit file `.env`** - Chứa thông tin nhạy cảm
2. **KHÔNG push trực tiếp vào `main` hoặc `dev`** - Luôn tạo PR
3. **Pull code mới trước khi tạo nhánh** - Tránh conflict
4. **Test kỹ trước khi tạo PR** - Đảm bảo không lỗi

---

## 📞 Liên hệ

- Owner: [@Anhvu1107](https://github.com/Anhvu1107)
