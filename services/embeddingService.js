/**
 * embeddingService.js
 *
 * Gọi Gemini Embedding API để chuyển văn bản thành vector số học.
 * Vector này dùng để tính độ tương đồng ngữ nghĩa (cosine similarity)
 * giữa câu hỏi của người dùng và các chunk trong knowledge base.
 *
 * Model: gemini-embedding-004 (hỗ trợ 768 chiều, miễn phí với quota hợp lý)
 * SDK:   @google/genai v2.x
 */

require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

// Lấy model embedding từ env, mặc định dùng gemini-embedding-001 (chuẩn theo gemini-api-dev)
const getEmbeddingModel = () =>
    process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';

// Khởi tạo Gemini client (lazy, chỉ tạo khi cần)
const getAI = () => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY chưa được cấu hình trong .env');
    }
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

/**
 * Embed một đoạn văn bản thành vector số học.
 *
 * @param {string} text      - Văn bản cần embed
 * @param {string} taskType  - "RETRIEVAL_DOCUMENT" khi embed chunk lưu vào DB,
 *                             "RETRIEVAL_QUERY" khi embed câu hỏi để tìm kiếm
 * @returns {Promise<number[]>} Vector embedding (768 chiều)
 */
async function embedText(text, taskType = 'RETRIEVAL_DOCUMENT') {
    const ai = getAI();
    const config = taskType ? { taskType } : {};
    const response = await ai.models.embedContent({
        model: getEmbeddingModel(),
        contents: text,
        config,
    });

    // response có thể là response.embedding.values hoặc response.embeddings[0].values tùy phiên bản SDK
    const values = response?.embedding?.values || response?.embeddings?.[0]?.values;
    if (!Array.isArray(values) || values.length === 0) {
        throw new Error('Gemini Embedding API trả về kết quả rỗng');
    }

    return values;
}

/**
 * Embed câu hỏi của người dùng để so sánh với knowledge base.
 * Dùng taskType RETRIEVAL_QUERY để tối ưu cho tìm kiếm.
 *
 * @param {string} query - Câu hỏi người dùng
 * @returns {Promise<number[]>}
 */
async function embedQuery(query) {
    return embedText(query, 'RETRIEVAL_QUERY');
}

/**
 * Tính độ tương đồng cosine giữa hai vector.
 * Giá trị từ -1 đến 1; càng gần 1 càng tương đồng.
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
function cosineSimilarity(a, b) {
    if (a.length !== b.length) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dot   += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}

module.exports = { embedText, embedQuery, cosineSimilarity };

