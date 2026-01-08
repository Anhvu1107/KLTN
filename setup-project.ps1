# AURA ARCHIVE - Project Setup Script
# Run this script in PowerShell from the KLTN directory

Write-Host "Creating AURA ARCHIVE Project Structure..." -ForegroundColor Cyan

# CLIENT (Nuxt.js 3)
Write-Host "Creating Client (Nuxt.js) structure..." -ForegroundColor Yellow

# Assets
New-Item -ItemType Directory -Force -Path "client/assets/css" | Out-Null
New-Item -ItemType Directory -Force -Path "client/assets/fonts" | Out-Null
New-Item -ItemType Directory -Force -Path "client/assets/images" | Out-Null

# Components - Organized by feature
New-Item -ItemType Directory -Force -Path "client/components/common" | Out-Null
New-Item -ItemType Directory -Force -Path "client/components/layout" | Out-Null
New-Item -ItemType Directory -Force -Path "client/components/product" | Out-Null
New-Item -ItemType Directory -Force -Path "client/components/home" | Out-Null
New-Item -ItemType Directory -Force -Path "client/components/cart" | Out-Null
New-Item -ItemType Directory -Force -Path "client/components/checkout" | Out-Null
New-Item -ItemType Directory -Force -Path "client/components/ai" | Out-Null

# Composables - Reusable Vue composition functions
New-Item -ItemType Directory -Force -Path "client/composables" | Out-Null

# Layouts
New-Item -ItemType Directory -Force -Path "client/layouts" | Out-Null

# Middleware
New-Item -ItemType Directory -Force -Path "client/middleware" | Out-Null

# Pages - Organized by feature
New-Item -ItemType Directory -Force -Path "client/pages/auth" | Out-Null
New-Item -ItemType Directory -Force -Path "client/pages/admin/products" | Out-Null
New-Item -ItemType Directory -Force -Path "client/pages/admin/orders" | Out-Null
New-Item -ItemType Directory -Force -Path "client/pages/admin/users" | Out-Null
New-Item -ItemType Directory -Force -Path "client/pages/admin/ai-config" | Out-Null
New-Item -ItemType Directory -Force -Path "client/pages/shop" | Out-Null
New-Item -ItemType Directory -Force -Path "client/pages/account" | Out-Null

# Plugins
New-Item -ItemType Directory -Force -Path "client/plugins" | Out-Null

# Public assets
New-Item -ItemType Directory -Force -Path "client/public/images" | Out-Null
New-Item -ItemType Directory -Force -Path "client/public/icons" | Out-Null

# Services - API wrappers
New-Item -ItemType Directory -Force -Path "client/services" | Out-Null

# Stores - Pinia state management
New-Item -ItemType Directory -Force -Path "client/stores" | Out-Null

# Types - TypeScript interfaces
New-Item -ItemType Directory -Force -Path "client/types" | Out-Null

# Utils - Helper functions
New-Item -ItemType Directory -Force -Path "client/utils" | Out-Null

# SERVER (Express.js)
Write-Host "Creating Server (Express.js) structure..." -ForegroundColor Yellow

# Config
New-Item -ItemType Directory -Force -Path "server/src/config" | Out-Null

# Controllers - Handle HTTP requests only
New-Item -ItemType Directory -Force -Path "server/src/controllers" | Out-Null

# Services - Business logic
New-Item -ItemType Directory -Force -Path "server/src/services" | Out-Null

# Models - Sequelize models
New-Item -ItemType Directory -Force -Path "server/src/models" | Out-Null

# Routes - API endpoints
New-Item -ItemType Directory -Force -Path "server/src/routes/v1" | Out-Null

# Middlewares
New-Item -ItemType Directory -Force -Path "server/src/middlewares" | Out-Null

# Utils - Helper functions
New-Item -ItemType Directory -Force -Path "server/src/utils" | Out-Null

# Validators - Request validation
New-Item -ItemType Directory -Force -Path "server/src/validators" | Out-Null

# DTOs - Data Transfer Objects
New-Item -ItemType Directory -Force -Path "server/src/dtos" | Out-Null

# Constants
New-Item -ItemType Directory -Force -Path "server/src/constants" | Out-Null

# Uploads folder
New-Item -ItemType Directory -Force -Path "server/uploads" | Out-Null

# AI SERVICE (Python FastAPI)
Write-Host "Creating AI Service (FastAPI) structure..." -ForegroundColor Yellow

# App structure
New-Item -ItemType Directory -Force -Path "ai_service/app/routers" | Out-Null
New-Item -ItemType Directory -Force -Path "ai_service/app/services" | Out-Null
New-Item -ItemType Directory -Force -Path "ai_service/app/models" | Out-Null
New-Item -ItemType Directory -Force -Path "ai_service/app/schemas" | Out-Null
New-Item -ItemType Directory -Force -Path "ai_service/app/core" | Out-Null
New-Item -ItemType Directory -Force -Path "ai_service/app/utils" | Out-Null

# CREATE PLACEHOLDER FILES
Write-Host "Creating placeholder files..." -ForegroundColor Yellow

# Client files
New-Item -ItemType File -Force -Path "client/assets/css/tailwind.css" | Out-Null
New-Item -ItemType File -Force -Path "client/components/common/AppButton.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/common/AppInput.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/common/AppLoader.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/common/AppModal.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/common/AppCard.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/layout/TheHeader.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/layout/TheFooter.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/layout/TheSidebar.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/product/ProductCard.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/product/ProductFilter.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/product/ProductGallery.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/home/HeroBanner.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/home/FeaturedProducts.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/home/BrandShowcase.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/cart/CartItem.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/cart/CartSummary.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/checkout/CheckoutForm.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/checkout/PaymentMethod.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/ai/ChatBot.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/components/ai/ChatMessage.vue" | Out-Null

# Composables
New-Item -ItemType File -Force -Path "client/composables/useAuth.ts" | Out-Null
New-Item -ItemType File -Force -Path "client/composables/useCart.ts" | Out-Null
New-Item -ItemType File -Force -Path "client/composables/useApi.ts" | Out-Null
New-Item -ItemType File -Force -Path "client/composables/useNotification.ts" | Out-Null

# Layouts
New-Item -ItemType File -Force -Path "client/layouts/default.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/layouts/admin.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/layouts/auth.vue" | Out-Null

# Middleware
New-Item -ItemType File -Force -Path "client/middleware/auth.ts" | Out-Null
New-Item -ItemType File -Force -Path "client/middleware/admin.ts" | Out-Null
New-Item -ItemType File -Force -Path "client/middleware/guest.ts" | Out-Null

# Pages
New-Item -ItemType File -Force -Path "client/pages/index.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/auth/login.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/auth/register.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/auth/forgot-password.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/auth/reset-password.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/admin/index.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/admin/products/index.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/admin/products/create.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/admin/products/[id].vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/admin/orders/index.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/admin/orders/[id].vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/admin/users/index.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/admin/ai-config/index.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/shop/index.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/shop/[id].vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/cart.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/checkout.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/contact.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/account/index.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/account/orders.vue" | Out-Null
New-Item -ItemType File -Force -Path "client/pages/account/profile.vue" | Out-Null

# Plugins
New-Item -ItemType File -Force -Path "client/plugins/api.ts" | Out-Null

# Services - API wrappers
New-Item -ItemType File -Force -Path "client/services/auth.api.ts" | Out-Null
New-Item -ItemType File -Force -Path "client/services/product.api.ts" | Out-Null
New-Item -ItemType File -Force -Path "client/services/order.api.ts" | Out-Null
New-Item -ItemType File -Force -Path "client/services/user.api.ts" | Out-Null
New-Item -ItemType File -Force -Path "client/services/chat.api.ts" | Out-Null

# Stores
New-Item -ItemType File -Force -Path "client/stores/user.store.ts" | Out-Null
New-Item -ItemType File -Force -Path "client/stores/cart.store.ts" | Out-Null
New-Item -ItemType File -Force -Path "client/stores/product.store.ts" | Out-Null
New-Item -ItemType File -Force -Path "client/stores/notification.store.ts" | Out-Null

# Types
New-Item -ItemType File -Force -Path "client/types/user.types.ts" | Out-Null
New-Item -ItemType File -Force -Path "client/types/product.types.ts" | Out-Null
New-Item -ItemType File -Force -Path "client/types/order.types.ts" | Out-Null
New-Item -ItemType File -Force -Path "client/types/api.types.ts" | Out-Null

# Utils
New-Item -ItemType File -Force -Path "client/utils/formatters.ts" | Out-Null
New-Item -ItemType File -Force -Path "client/utils/validators.ts" | Out-Null
New-Item -ItemType File -Force -Path "client/utils/constants.ts" | Out-Null

# Server files
New-Item -ItemType File -Force -Path "server/src/config/db.config.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/config/email.config.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/config/jwt.config.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/config/cors.config.js" | Out-Null

# Controllers
New-Item -ItemType File -Force -Path "server/src/controllers/auth.controller.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/controllers/product.controller.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/controllers/order.controller.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/controllers/user.controller.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/controllers/variant.controller.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/controllers/chat.controller.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/controllers/admin.controller.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/controllers/contact.controller.js" | Out-Null

# Services
New-Item -ItemType File -Force -Path "server/src/services/auth.service.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/services/product.service.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/services/order.service.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/services/user.service.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/services/variant.service.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/services/chat.service.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/services/email.service.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/services/upload.service.js" | Out-Null

# Models
New-Item -ItemType File -Force -Path "server/src/models/index.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/models/user.model.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/models/product.model.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/models/variant.model.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/models/order.model.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/models/order-item.model.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/models/system-prompt.model.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/models/chat-log.model.js" | Out-Null

# Routes
New-Item -ItemType File -Force -Path "server/src/routes/index.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/routes/v1/auth.routes.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/routes/v1/product.routes.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/routes/v1/order.routes.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/routes/v1/user.routes.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/routes/v1/chat.routes.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/routes/v1/admin.routes.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/routes/v1/contact.routes.js" | Out-Null

# Middlewares
New-Item -ItemType File -Force -Path "server/src/middlewares/auth.middleware.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/middlewares/admin.middleware.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/middlewares/upload.middleware.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/middlewares/error.middleware.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/middlewares/validate.middleware.js" | Out-Null

# Utils
New-Item -ItemType File -Force -Path "server/src/utils/sendEmail.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/utils/AppError.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/utils/catchAsync.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/utils/generateToken.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/utils/logger.js" | Out-Null

# Validators
New-Item -ItemType File -Force -Path "server/src/validators/auth.validator.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/validators/product.validator.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/validators/order.validator.js" | Out-Null

# Constants
New-Item -ItemType File -Force -Path "server/src/constants/roles.constant.js" | Out-Null
New-Item -ItemType File -Force -Path "server/src/constants/status.constant.js" | Out-Null

# Main server file
New-Item -ItemType File -Force -Path "server/server.js" | Out-Null

# AI Service files
New-Item -ItemType File -Force -Path "ai_service/app/__init__.py" | Out-Null
New-Item -ItemType File -Force -Path "ai_service/app/main.py" | Out-Null
New-Item -ItemType File -Force -Path "ai_service/app/routers/__init__.py" | Out-Null
New-Item -ItemType File -Force -Path "ai_service/app/routers/chat.py" | Out-Null
New-Item -ItemType File -Force -Path "ai_service/app/services/__init__.py" | Out-Null
New-Item -ItemType File -Force -Path "ai_service/app/services/stylist_engine.py" | Out-Null
New-Item -ItemType File -Force -Path "ai_service/app/services/prompt_service.py" | Out-Null
New-Item -ItemType File -Force -Path "ai_service/app/models/__init__.py" | Out-Null
New-Item -ItemType File -Force -Path "ai_service/app/schemas/__init__.py" | Out-Null
New-Item -ItemType File -Force -Path "ai_service/app/schemas/chat.py" | Out-Null
New-Item -ItemType File -Force -Path "ai_service/app/core/__init__.py" | Out-Null
New-Item -ItemType File -Force -Path "ai_service/app/core/config.py" | Out-Null
New-Item -ItemType File -Force -Path "ai_service/app/utils/__init__.py" | Out-Null
New-Item -ItemType File -Force -Path "ai_service/requirements.txt" | Out-Null

# Environment files
New-Item -ItemType File -Force -Path "client/.env.example" | Out-Null
New-Item -ItemType File -Force -Path "server/.env.example" | Out-Null
New-Item -ItemType File -Force -Path "ai_service/.env.example" | Out-Null

# Root files
New-Item -ItemType File -Force -Path ".gitignore" | Out-Null
New-Item -ItemType File -Force -Path "README.md" | Out-Null

Write-Host "AURA ARCHIVE Project Structure Created Successfully!" -ForegroundColor Green
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "   1. cd client; npm install" -ForegroundColor White
Write-Host "   2. cd server; npm install" -ForegroundColor White
Write-Host "   3. cd ai_service; pip install -r requirements.txt" -ForegroundColor White
