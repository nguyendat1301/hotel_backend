/**
 * retrievalService.js
 *
 * Thực hiện Retrieval trong pipeline RAG:
 *   1. Nhận câu hỏi người dùng
 *   2. Embed câu hỏi thành vector
 *   3. Tải các chunks từ MySQL (lọc theo category nếu có)
 *   4. Tính cosine similarity giữa câu hỏi và từng chunk
 *   5. Trả về top-K chunks có độ tương đồng cao nhất
 *
 * Lưu ý về hiệu năng:
 *   Knowledge base tĩnh chỉ có ~15-30 chunks nên việc tính similarity
 *   trong memory hoàn toàn đủ nhanh. Với quy mô lớn hơn thì nên dùng
 *   vector DB chuyên dụng (Pinecone, Weaviate, pgvector...).
 */

require('dotenv').config();
const { embedQuery, cosineSimilarity } = require('./embeddingService');
const { getAllChunks, getChunksByCategories } = require('../repositories/chatbotRepository');

// Số lượng chunks tối đa đưa vào context Gemini
const TOP_K = 3;
// Ngưỡng similarity tối thiểu để chunk được coi là liên quan (0 đến 1)
const SIMILARITY_THRESHOLD = 0.5;

/**
 * Tìm các chunks liên quan nhất đến câu hỏi.
 *
 * @param {string}   query      - Câu hỏi người dùng
 * @param {string[]} categories - Mảng category cần tìm (null = tìm tất cả)
 * @param {number}   topK       - Số lượng kết quả trả về
 * @returns {Promise<Array<{ chunk_id, category, title, content, score }>>}
 */
async function retrieveRelevantChunks(query, categories = null, topK = TOP_K) {
    // Lấy chunks từ DB (lọc theo category nếu có)
    const chunks = categories && categories.length > 0
        ? await getChunksByCategories(categories)
        : await getAllChunks();

    // Nếu không có chunk nào trong DB, trả về rỗng
    if (!chunks || chunks.length === 0) {
        return [];
    }

    // Lọc ra chunks đã có embedding (đã qua ingestion)
    const embeddedChunks = chunks.filter((c) => {
        if (!c.embedding) return false;
        try {
            const emb = typeof c.embedding === 'string' ? JSON.parse(c.embedding) : c.embedding;
            return Array.isArray(emb) && emb.length > 0;
        } catch {
            return false;
        }
    });

    if (embeddedChunks.length === 0) {
        return [];
    }

    // Embed câu hỏi (taskType RETRIEVAL_QUERY)
    const queryEmbedding = await embedQuery(query);

    // Tính cosine similarity cho từng chunk
    const scored = embeddedChunks.map((chunk) => {
        const chunkEmbedding = typeof chunk.embedding === 'string'
            ? JSON.parse(chunk.embedding)
            : chunk.embedding;

        const score = cosineSimilarity(queryEmbedding, chunkEmbedding);

        return {
            chunk_id: chunk.chunk_id,
            category: chunk.category,
            title: chunk.title,
            content: chunk.content,
            score,
        };
    });

    // Sắp xếp theo điểm giảm dần, lọc ngưỡng và lấy top-K
    const results = scored
        .filter((item) => item.score >= SIMILARITY_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    return results;
}

/**
 * Xây dựng context string từ các chunks để đưa vào prompt Gemini.
 *
 * @param {Array} chunks - Kết quả từ retrieveRelevantChunks
 * @returns {string}
 */
function buildContextFromChunks(chunks) {
    if (!chunks || chunks.length === 0) {
        return '';
    }

    return chunks
        .map((chunk, i) => `[${i + 1}] ${chunk.title}:\n${chunk.content}`)
        .join('\n\n');
}

/**
 * Lấy metadata sources để hiển thị cho người dùng.
 *
 * @param {Array} chunks
 * @returns {Array<{ title: string, category: string }>}
 */
function extractSources(chunks) {
    return chunks.map((c) => ({ title: c.title, category: c.category }));
}

module.exports = {
    retrieveRelevantChunks,
    buildContextFromChunks,
    extractSources,
};

