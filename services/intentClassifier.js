/**
 * intentClassifier.js
 *
 * Phân loại câu hỏi của người dùng thành các loại intent khác nhau
 * bằng keyword matching – không tốn API call, nhanh và dễ hiểu.
 *
 * Các loại intent:
 *   - 'availability' : Hỏi về tình trạng phòng, số phòng còn trống
 *   - 'room_info'    : Hỏi về loại phòng, giá, tiện nghi
 *   - 'policy'       : Hỏi về chính sách đặt phòng, hủy phòng, quy định
 *   - 'service'      : Hỏi về dịch vụ, tiện ích khách sạn
 *   - 'contact'      : Hỏi về liên hệ, địa chỉ, giờ làm việc
 *   - 'general'      : Câu hỏi chung / không xác định được
 */

// Mỗi intent là mảng các regex/string tìm kiếm trong câu hỏi đã lowercase
const INTENT_RULES = [
    {
        intent: 'availability',
        keywords: [
            /còn phòng/,
            /phòng.*trống/,
            /trống.*phòng/,
            /phòng.*available/,
            /tình trạng phòng/,
            /có phòng.*không/,
            /đặt phòng.*ngày/,
            /ngày.*đến.*ngày/,
            /check[- ]?in.*ngày/,
            /từ ngày.*đến/,
            /từ\s+\d{1,2}.*đến/i,
            /từ\s+\d{1,2}.*tới/i,
            /\d{1,2}[\/\-]\d{1,2}.*[\-–đếnto]\s*\d{1,2}[\/\-]\d{1,2}/i,
            /(?:hôm nay|ngày mai|ngày mốt|ngày kia)\s*(?:đến|tới|-|–)\s*(?:hôm nay|ngày mai|ngày mốt|ngày kia)/i,
            /kiểm tra.*phòng/i,
            /xem.*phòng trống/i,
            /tìm.*phòng trống/i,
            /check.*phòng/i,
            /phòng nào còn/i,
            /còn phòng nào/i,
            /cuối tuần.*phòng/i,
            /phòng.*cuối tuần/i,
            /ngày mai.*phòng/i,
            /hôm nay.*phòng/i,
            /phòng.*ngày mai/i,
            /phòng.*hôm nay/i,
            /check[- ]?in.*check[- ]?out/i,
            /nhận phòng.*trả phòng/i,
        ],
    },
    {
        intent: 'room_info',
        keywords: [
            /loại phòng/,
            /các loại phòng/,
            /giá phòng/,
            /phòng.*giá/,
            /giá.*đêm/,
            /giá.*mỗi đêm/,
            /sức chứa/,
            /tối đa.*khách/,
            /phòng standard/,
            /phòng deluxe/,
            /phòng suite/,
            /phòng family/,
            /phòng đơn/,
            /phòng đôi/,
            /phòng vip/,
            /tiện nghi phòng/,
            /mô tả phòng/,
            /so sánh.*phòng/,
        ],
    },
    {
        intent: 'policy',
        keywords: [
            /chính sách/,
            /hủy phòng/,
            /hủy đặt/,
            /hoàn tiền/,
            /trẻ em/,
            /trẻ nhỏ/,
            /thú cưng/,
            /hút thuốc/,
            /smoking/,
            /quy định/,
            /nội quy/,
            /điều kiện/,
            /phí phát sinh/,
            /đặt cọc/,
        ],
    },
    {
        intent: 'service',
        keywords: [
            /dịch vụ/,
            /tiện ích/,
            /hồ bơi/,
            /bể bơi/,
            /swimming/,
            /spa/,
            /massage/,
            /phòng gym/,
            /fitness/,
            /nhà hàng/,
            /ăn uống/,
            /buffet/,
            /đưa đón/,
            /sân bay/,
            /airport/,
            /transfer/,
            /wifi/,
            /internet/,
            /đỗ xe/,
            /parking/,
            /giữ hành lý/,
            /phòng họp/,
            /hội nghị/,
            /sự kiện/,
            /sauna/,
            /xông hơi/,
        ],
    },
    {
        intent: 'contact',
        keywords: [
            /địa chỉ/,
            /ở đâu/,
            /liên hệ/,
            /số điện thoại/,
            /hotline/,
            /email/,
            /giờ làm việc/,
            /giờ mở cửa/,
            /check[- ]?in.*giờ/,
            /check[- ]?out.*giờ/,
            /giờ.*check/,
            /mấy giờ/,
            /nhận phòng/,
            /trả phòng/,
        ],
    },
];

/**
 * Phân loại câu hỏi của người dùng thành intent.
 *
 * @param {string} message - Câu hỏi người dùng
 * @param {Array}  [history] - Lịch sử hội thoại (optional)
 * @returns {{ intent: string, confidence: 'high'|'low' }}
 */
function classifyIntent(message, history = []) {
    const lower = message.toLowerCase().trim();

    for (const rule of INTENT_RULES) {
        const matched = rule.keywords.some((pattern) => {
            if (pattern instanceof RegExp) return pattern.test(lower);
            return lower.includes(pattern);
        });

        if (matched) {
            return { intent: rule.intent, confidence: 'high' };
        }
    }

    // Nếu không khớp trực tiếp nhưng trong ngữ cảnh hội thoại bot vừa hỏi ngày nhận/trả phòng
    if (Array.isArray(history) && history.length > 0) {
        const lastBotMsg = [...history].reverse().find((h) => h.role === 'model')?.parts?.[0]?.text?.toLowerCase() || '';
        const isWaitingForDates =
            lastBotMsg.includes('nhận phòng') ||
            lastBotMsg.includes('trả phòng') ||
            lastBotMsg.includes('check-in') ||
            lastBotMsg.includes('từ ngày nào') ||
            lastBotMsg.includes('phòng trống');

        if (isWaitingForDates) {
            // Kiểm tra xem user có đang trả lời ngày tháng không
            const containsDateNumber = /\d{1,2}/.test(lower) || /hôm nay|ngày mai|ngày mốt|ngày kia|cuối tuần/.test(lower);
            if (containsDateNumber) {
                return { intent: 'availability', confidence: 'high' };
            }
        }
    }

    return { intent: 'general', confidence: 'low' };
}

/**
 * Map intent sang category để tìm kiếm trong knowledge base.
 * Trả về null nếu không cần tìm (availability dùng DB trực tiếp).
 *
 * @param {string} intent
 * @returns {string[]|null} Mảng category cần tìm trong DB, hoặc null
 */
function intentToCategories(intent) {
    const map = {
        room_info:    ['room'],
        policy:       ['policy', 'faq'],
        service:      ['service', 'faq'],
        contact:      ['contact', 'faq'],
        general:      ['faq', 'policy', 'service', 'contact', 'room'],
        availability: null, // Dùng MySQL real-time, không cần knowledge base
    };

    // Dùng hasOwnProperty để phân biệt key có giá trị null vs key không tồn tại
    if (Object.prototype.hasOwnProperty.call(map, intent)) {
        return map[intent];
    }
    return ['faq', 'policy', 'service', 'contact', 'room'];
}

module.exports = { classifyIntent, intentToCategories };
