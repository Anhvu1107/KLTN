# AURA ARCHIVE

> Luxury Resell & Consignment Fashion E-commerce Platform

A full-stack monorepo featuring a Nuxt.js 3 frontend, Express.js backend, and Python FastAPI AI service.

## Tech Stack

| Service | Technology | Description |
|---------|------------|-------------|
| **Client** | Nuxt.js 3 + Vue 3 | Frontend with Tailwind CSS, Pinia, Headless UI |
| **Server** | Express.js + Node.js | REST API with PostgreSQL, Sequelize ORM |
| **AI Service** | FastAPI + Python | AI Stylist with OpenAI, LangChain |

## Project Structure

```
AURA-PROJECT/
├── client/          # Nuxt.js 3 Frontend
├── server/          # Express.js Backend API
├── ai_service/      # Python FastAPI AI Engine
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL 14+
- npm or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AURA-PROJECT
   ```

2. **Install Client dependencies**
   ```bash
   cd client
   npm install
   ```

3. **Install Server dependencies**
   ```bash
   cd server
   npm install
   ```

4. **Install AI Service dependencies**
   ```bash
   cd ai_service
   pip install -r requirements.txt
   ```

5. **Configure environment variables**
   - Copy `.env.example` to `.env` in each service directory
   - Update values as needed

### Development

```bash
# Terminal 1 - Client (http://localhost:3000)
cd client && npm run dev

# Terminal 2 - Server (http://localhost:5000)
cd server && npm run dev

# Terminal 3 - AI Service (http://localhost:8000)
cd ai_service && uvicorn app.main:app --reload
```

## Design System

AURA ARCHIVE follows a **Ralph Lauren-inspired luxury aesthetic**:

- **Typography**: Playfair Display (serif) for headings, Inter (sans) for body
- **Colors**: Black, White, Cream with Gold/Burgundy accents
- **Spacing**: Generous whitespace with elegant proportions
- **Interactions**: Subtle hover effects and smooth transitions

## License

Private - All rights reserved.
