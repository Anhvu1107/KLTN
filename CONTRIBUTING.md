# Hướng dẫn đóng góp (Contributing Guide)

## 🚀 Bắt đầu (Cho thành viên mới)

### 1. Clone project
```bash
git clone git@github.com:Anhvu1107/KLTN.git
cd KLTN
git checkout dev
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

### 3. Khởi động PostgreSQL Database

**Cách 1: Dùng Docker (Khuyến nghị)**
```bash
# Chạy PostgreSQL container
docker-compose up postgres -d

# Kiểm tra container đang chạy
docker ps
```

**Cách 2: Dùng PostgreSQL đã cài sẵn**
```sql
-- Mở pgAdmin hoặc psql, tạo database:
CREATE DATABASE aura_archive;
```

**Verify PostgreSQL đang chạy:**
```bash
# Kiểm tra kết nối (nếu cài psql)
psql -h localhost -U postgres -d aura_archive -c "SELECT 1;"

# Hoặc kiểm tra qua Docker
docker exec -it aura-postgres psql -U postgres -d aura_archive -c "SELECT 1;"
```

### 4. Cấu hình môi trường
```bash
# Copy file .env.example thành .env trong mỗi thư mục
cd server && copy .env.example .env
cd ../client && copy .env.example .env
cd ../ai_service && copy .env.example .env
# Mở từng file .env và điền thông tin database, API keys
```

### 5. Seed database (lần đầu)
```bash
cd server && npm run seed
```

### 6. Chạy development
```bash
# Terminal 1 - Client (http://localhost:3000)
cd client && npm run dev

# Terminal 2 - Server (http://localhost:5000)
cd server && npm run dev

# Terminal 3 - AI Service (http://localhost:8000)
cd ai_service && uvicorn app.main:app --reload --port 8000
```

---

## 🌿 Git Workflow

### Cấu trúc nhánh
```
main     ← Production (code ổn định, không code trực tiếp)
└── dev  ← Development (test trước khi lên main)
      └── feature/xxx  ← Nhánh riêng của từng người
```

### ⚠️ QUY TẮC QUAN TRỌNG
1. **KHÔNG BAO GIỜ** push trực tiếp vào `main` hoặc `dev`
2. **LUÔN LUÔN** tạo nhánh riêng để code
3. **LUÔN LUÔN** tạo Pull Request để merge

---

## 📋 Quy trình làm việc

### Bước 1: Tạo nhánh mới từ dev
```bash
git checkout dev              # Chuyển về dev
git pull origin dev           # Cập nhật code mới nhất
git checkout -b feature/ten-tinh-nang   # Tạo nhánh mới
```

**Đặt tên nhánh:**
| Loại | Format | Ví dụ |
|------|--------|-------|
| Tính năng mới | `feature/ten` | `feature/about-page` |
| Sửa bug | `fix/ten` | `fix/checkout-bug` |
| Hotfix khẩn | `hotfix/ten` | `hotfix/login-error` |

### Bước 2: Code và commit
```bash
# Sau khi code xong
git add .
git commit -m "feat: add about page"
```

**Commit message format:**
| Prefix | Ý nghĩa | Ví dụ |
|--------|---------|-------|
| `feat:` | Tính năng mới | `feat: add payment vnpay` |
| `fix:` | Sửa bug | `fix: cart total calculation` |
| `docs:` | Cập nhật docs | `docs: update README` |
| `style:` | CSS/UI | `style: update header color` |
| `refactor:` | Refactor | `refactor: move utils` |

### Bước 3: Push lên GitHub
```bash
git push origin feature/ten-tinh-nang
```

### Bước 4: Tạo Pull Request
1. Vào GitHub → Pull Requests → **New Pull Request**
2. Base: `dev` ← Compare: `feature/ten-tinh-nang`
3. Điền title và mô tả những gì đã làm
4. Click **Create Pull Request**
5. Đợi Leader review

### Bước 5: Leader review và merge
- Leader xem code, comment nếu cần sửa
- Sau khi approve → Merge vào `dev`
- Delete nhánh feature sau khi merge

### Bước 6: Merge dev vào main (Leader làm)
Khi dev đã test ổn định:
```bash
git checkout main
git merge dev
git push origin main
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
5. **Viết commit message rõ ràng** - Để dễ track

---

## 📞 Liên hệ

- Leader: [@Anhvu1107](https://github.com/Anhvu1107)
