-- Migration: Tạo bảng lưu knowledge base chunks cho RAG chatbot
-- Chạy: mysql -u root -p hotel < migrations/001_chatbot_knowledge_chunks.sql

CREATE TABLE IF NOT EXISTS chatbot_knowledge_chunks (
    id          INT AUTO_INCREMENT PRIMARY KEY,

    -- Định danh duy nhất để tránh insert trùng khi re-ingest
    chunk_id    VARCHAR(100) NOT NULL UNIQUE,

    -- Phân loại để lọc theo ngữ cảnh câu hỏi
    category    ENUM('faq', 'policy', 'room', 'service', 'contact') NOT NULL,

    -- Tiêu đề để hiển thị cho người dùng (sources)
    title       VARCHAR(255) NOT NULL,

    -- Nội dung chunk (200-400 tokens)
    content     TEXT NOT NULL,

    -- Embedding vector từ Gemini (JSON array of float)
    -- NULL khi mới insert, được điền sau khi embed
    embedding   JSON DEFAULT NULL,

    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_category (category),
    INDEX idx_chunk_id (chunk_id)
);

