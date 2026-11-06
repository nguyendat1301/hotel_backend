# Hotel Booking System Backend

The Node.js and Express backend API for the Hotel Booking System. It handles room management, booking transactions with conflict detection, user authentication (including Google OAuth), email notifications, media uploads via Cloudinary, and an AI Chatbot integrated with Retrieval-Augmented Generation (RAG) using Google Gemini API.

## Features

- **Authentication & Security**: Email-based signup/login, Google OAuth 2.0 integration, JWT authentication stored in cookies, password hashing with `bcryptjs`, and rate limiting on authentication and password reset routes.
- **Room & Room Type Management**: CRUD operations for rooms and room types with image upload integration to Cloudinary.
- **Booking Engine**: Transaction-safe booking process that handles double-booking checks, total cost calculation, and transaction rollback.
- **Customer Management**: Register and manage customer profiles and metadata.
- **Notification Service**: Automated HTML email notifications using `nodemailer` for booking confirmations and password reset workflows.
- **Database Layer**: Relational data modeling using MySQL (`mysql2` connection pool) with structured Repository and Service pattern separation.
- **AI Chatbot (RAG + Gemini API)**: 
  - Intent classification (FAQ, chính sách, phòng, tình trạng phòng, liên hệ).
  - Semantic vector search với cosine similarity trên MySQL knowledge chunks.
  - Tích hợp dữ liệu động thời gian thực từ database MySQL (giá, sức chứa, số phòng khả dụng).
  - Sử dụng Google Gemini API (`gemini-3.8-flash` cho generation, `gemini-embedding-001` cho embedding) theo chuẩn SDK `@google/genai`.
  - Cơ chế tự động thử lại (exponential backoff retry) và xử lý lỗi upstream 429/503.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL (sử dụng `mysql2` connection pool với promise wrapper)
- **AI & RAG**: Google Gemini API (`@google/genai` v2.32+), Cosine Similarity Semantic Search
- **Authentication**: JWT (`jsonwebtoken`), Google Auth Library (`google-auth-library`), Cookie Parser (`cookie-parser`)
- **Media Upload**: Multer, Cloudinary
- **Notifications**: Nodemailer
- **Utilities**: Bcrypt.js, Express Rate Limit, Dotenv

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 hoặc cao hơn)
- [MySQL Database Server](https://www.mysql.com/) (v8.0 hoặc MariaDB)
- Google Gemini API Key từ [Google AI Studio](https://aistudio.google.com/)

---

## Getting Started

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình biến môi trường (`.env`)

Tạo file `.env` tại thư mục `hotel-back/` dựa trên `.env.example`:

```ini
# ===== Database =====
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hotel
DB_CONNECTION_LIMIT=10
PORT=3306

# ===== Server =====
PORT_Server=5000
FRONTEND_URL=http://localhost:5173

# ===== Gemini AI (Chatbot RAG) =====
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
CHATBOT_MAX_RETRIES=3
CHATBOT_TIMEOUT_MS=30000

# ===== Auth & Others =====
JWT_SECRET=your_jwt_secret_key_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 3. Khởi tạo bảng Knowledge Base trong MySQL

Chạy file migration để tạo bảng `chatbot_knowledge_chunks`:

```bash
# Cách 1: Qua dòng lệnh MySQL
mysql -u root -p hotel < migrations/001_chatbot_knowledge_chunks.sql

# Cách 2: Hoặc chạy script migration có sẵn trong dự án
```

### 4. Nạp dữ liệu Knowledge Base (Ingestion)

Nạp các chunks thông tin tĩnh của khách sạn (FAQ, chính sách, tiện ích, quy định) và sinh vector embedding:

```bash
npm run ingest
```

*(Thêm cờ `--force` nếu muốn embed lại toàn bộ các chunk: `node scripts/ingest.js --force`)*

### 5. Chạy kiểm thử tự động

```bash
# Chạy bộ unit test logic RAG (không cần gọi mạng API):
npm run test:chatbot

# Chạy toàn bộ test suite (gồm cả test integration Gemini API):
npm test
```

### 6. Khởi động server

```bash
# Development (với nodemon tự reload khi sửa code)
npm run dev

# Production
npm start
```

---

## Kiến trúc Chatbot RAG (Retrieval-Augmented Generation)

```
[Khách hàng đặt câu hỏi]
          │
          ▼
[intentClassifier.js] ──────────► Phân loại intent:
          │                       • availability (Hỏi tình trạng phòng)
          │                       • room_info    (Hỏi giá, loại phòng)
          │                       • policy       (Chính sách, hủy phòng)
          │                       • service      (Dịch vụ, hồ bơi, spa)
          │                       • contact      (Giờ check-in, địa chỉ)
          │
    ┌─────┴────────────────────────────────┐
    ▼                                      ▼
[Dynamic Query: MySQL]            [Static Retrieval: Vector Search]
Query trực tiếp room_types        Embed query bằng gemini-embedding-001
và tính số phòng khả dụng         Tính cosine similarity với chunks trong DB
    │                                      │
    └──────────────────┬───────────────────┘
                       ▼
            [Xây dựng Context & Prompt]
          (Kèm quy tắc chống Prompt Injection)
                       ▼
            [Gemini API: gemini-3.8-flash]
            (Tự động retry với Exponential Backoff)
                       ▼
            [Trả về Response: answer + sources]
```

### Các Endpoint của Chatbot

| Phương thức | Endpoint | Quyền hạn | Mô tả |
|---|---|---|---|
| `POST` | `/api/chatbot` | Public (Rate limit 30 req/15 phút) | Gửi câu hỏi cho chatbot, nhận phản hồi kèm danh sách nguồn trích dẫn (`sources`). |
| `POST` | `/api/chatbot/ingest` | Admin (`verifyToken` + `ADMIN`) | Kích hoạt nạp lại Knowledge Base từ API. |
| `GET` | `/api/chatbot/stats` | Admin (`verifyToken` + `ADMIN`) | Xem số lượng chunks và chuyên mục trong Knowledge Base. |
