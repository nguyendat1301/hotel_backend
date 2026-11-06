/**
 * scripts/ingest.js
 *
 * Script chạy một lần để nạp dữ liệu tĩnh của khách sạn vào knowledge base.
 *
 * Cách chạy:
 *   node scripts/ingest.js
 *   node scripts/ingest.js --force   (embed lại toàn bộ, dù nội dung chưa đổi)
 *
 * Cần chạy:
 *   - Lần đầu khi setup dự án
 *   - Mỗi khi cập nhật nội dung trong data/hotel_knowledge.js
 *   - Khi muốn refresh embedding (thay đổi model)
 *
 * Yêu cầu:
 *   - File .env đã cấu hình GEMINI_API_KEY và thông tin DB
 *   - Đã chạy migration SQL: migrations/001_chatbot_knowledge_chunks.sql
 */

require('dotenv').config();

const { ingestKnowledgeBase, getKnowledgeBaseStats } = require('../services/knowledgeBaseService');
const db = require('../db');

async function main() {
    const forceUpdate = process.argv.includes('--force');

    console.log('='.repeat(60));
    console.log('  LakeSide Hotel – Knowledge Base Ingestion');
    console.log('='.repeat(60));

    if (forceUpdate) {
        console.log('⚠️  Chế độ FORCE: Toàn bộ chunks sẽ được embed lại.\n');
    }

    try {
        // Hiển thị stats trước khi ingest
        const statsBefore = await getKnowledgeBaseStats();
        console.log(`📚 Knowledge base hiện tại: ${statsBefore.totalChunks} chunks trong DB`);
        console.log(`📄 Nguồn dữ liệu: ${statsBefore.totalInSource} chunks trong hotel_knowledge.js\n`);

        // Chạy ingestion
        const result = await ingestKnowledgeBase({ forceUpdate });

        console.log('\n✅ Ingestion hoàn thành!');

        if (result.errors > 0) {
            console.log(`\n⚠️  Có ${result.errors} chunk bị lỗi. Kiểm tra log ở trên.`);
            process.exit(1);
        }
    } catch (err) {
        console.error('\n❌ Ingestion thất bại:', err.message);
        if (err.message.includes('chatbot_knowledge_chunks')) {
            console.error('\n💡 Gợi ý: Hãy chạy migration trước:');
            console.error('   mysql -u root -p hotel < migrations/001_chatbot_knowledge_chunks.sql');
        }
        process.exit(1);
    } finally {
        // Đóng kết nối DB
        await db.end().catch(() => {});
    }
}

main();

