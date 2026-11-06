/**
 * knowledgeBaseService.js
 *
 * Quản lý việc nạp (ingestion) dữ liệu tĩnh vào knowledge base.
 * Quy trình:
 *   1. Đọc danh sách chunks từ data/hotel_knowledge.js
 *   2. Với mỗi chunk: embed nội dung qua Gemini Embedding API
 *   3. Lưu vào MySQL (upsert theo chunk_id để tránh trùng lặp)
 *
 * Chạy script: node scripts/ingest.js
 */

require('dotenv').config();
const { HOTEL_KNOWLEDGE_CHUNKS } = require('../data/hotel_knowledge');
const { embedText } = require('./embeddingService');
const {
    upsertKnowledgeChunk,
    getChunkCount,
} = require('../repositories/chatbotRepository');

// Delay giữa các lần gọi API để tránh vượt quota
const EMBED_DELAY_MS = 300;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Nạp toàn bộ knowledge base vào MySQL.
 * - Nếu chunk_id đã tồn tại và nội dung chưa thay đổi: bỏ qua.
 * - Nếu là chunk mới hoặc nội dung đã thay đổi: embed lại và cập nhật.
 *
 * @param {{ forceUpdate?: boolean }} options
 * @returns {Promise<{ inserted: number, updated: number, skipped: number }>}
 */
async function ingestKnowledgeBase(options = {}) {
    const { forceUpdate = false } = options;

    console.log(`\n🚀 Bắt đầu ingest ${HOTEL_KNOWLEDGE_CHUNKS.length} chunks vào knowledge base...`);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < HOTEL_KNOWLEDGE_CHUNKS.length; i++) {
        const chunk = HOTEL_KNOWLEDGE_CHUNKS[i];
        const { chunk_id, category, title, content } = chunk;

        process.stdout.write(`  [${i + 1}/${HOTEL_KNOWLEDGE_CHUNKS.length}] ${chunk_id} ... `);

        try {
            // Kiểm tra xem chunk có tồn tại chưa
            const existing = await getChunkByChunkId(chunk_id);

            if (existing && !forceUpdate && existing.content === content) {
                console.log('✓ Bỏ qua (không thay đổi)');
                skipped++;
                continue;
            }

            // Embed nội dung chunk (dùng taskType RETRIEVAL_DOCUMENT)
            const embedding = await embedText(content, 'RETRIEVAL_DOCUMENT');

            const result = await upsertKnowledgeChunk({
                chunk_id,
                category,
                title,
                content,
                embedding,
            });

            if (result.isNew) {
                console.log('✅ Đã thêm mới');
                inserted++;
            } else {
                console.log('🔄 Đã cập nhật');
                updated++;
            }

            // Nghỉ giữa các request để tránh rate limit
            if (i < HOTEL_KNOWLEDGE_CHUNKS.length - 1) {
                await delay(EMBED_DELAY_MS);
            }
        } catch (err) {
            console.log(`❌ Lỗi: ${err.message}`);
            errors++;
        }
    }

    const summary = { inserted, updated, skipped, errors };
    console.log('\n📊 Kết quả ingest:');
    console.log(`   ✅ Mới thêm:  ${inserted}`);
    console.log(`   🔄 Cập nhật:  ${updated}`);
    console.log(`   ✓  Bỏ qua:   ${skipped}`);
    console.log(`   ❌ Lỗi:      ${errors}`);

    return summary;
}

/**
 * Lấy chunk theo chunk_id để kiểm tra trước khi embed lại.
 * (Hàm nội bộ, dùng trong service này)
 */
async function getChunkByChunkId(chunkId) {
    // Import ở đây để tránh circular dependency nếu có
    const { getChunkByIdFromDB } = require('../repositories/chatbotRepository');
    return getChunkByIdFromDB(chunkId);
}

/**
 * Lấy thống kê knowledge base hiện tại.
 */
async function getKnowledgeBaseStats() {
    const count = await getChunkCount();
    return {
        totalChunks: count,
        totalInSource: HOTEL_KNOWLEDGE_CHUNKS.length,
        categories: [...new Set(HOTEL_KNOWLEDGE_CHUNKS.map((c) => c.category))],
    };
}

module.exports = { ingestKnowledgeBase, getKnowledgeBaseStats };

