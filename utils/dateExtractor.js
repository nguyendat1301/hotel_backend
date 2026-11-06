/**
 * dateExtractor.js
 *
 * Trích xuất khoảng ngày nhận phòng (check-in) và trả phòng (check-out)
 * từ câu hỏi của khách hàng (tiếng Việt & tiếng Anh) và lịch sử hội thoại.
 *
 * Hỗ trợ các định dạng:
 *   - DD/MM/YYYY hoặc DD-MM-YYYY (VD: 10/11/2026 đến 12/11/2026)
 *   - DD/MM hoặc DD-MM (tự động điền năm hiện tại hoặc năm tiếp theo)
 *   - YYYY-MM-DD hoặc YYYY/MM/DD
 *   - Ngày X tháng Y [năm Z] (VD: ngày 10 tháng 11 đến ngày 12 tháng 11)
 *   - Từ X đến Y tháng M [năm Z] (VD: từ 10 đến 12 tháng 11)
 *   - Từ [ngày] ở N đêm / N ngày (VD: từ 10/11 ở 2 đêm)
 *   - Từ tương đối: hôm nay, tối nay, ngày mai, ngày mốt, ngày kia, cuối tuần này
 *   - Ngày đơn lẻ (VD: ngày 10/11 còn phòng không -> mặc định 1 đêm)
 */

const { getTodayDateOnly, calculateNights, isValidDateOnly } = require('./dateOnly');

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Format Date object thành YYYY-MM-DD
 */
function toDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Parse chuỗi ngày YYYY-MM-DD thành Date object (local time)
 */
function parseDateString(str) {
    const parts = str.split('-');
    if (parts.length !== 3) return null;
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

/**
 * Cộng thêm N ngày vào Date hoặc chuỗi YYYY-MM-DD
 */
function addDays(dateOrStr, days) {
    const d = typeof dateOrStr === 'string' ? parseDateString(dateOrStr) : new Date(dateOrStr);
    d.setDate(d.getDate() + days);
    return toDateString(d);
}

/**
 * Chuẩn hóa ngày với năm phù hợp.
 * Nếu không có năm, dùng currentYear.
 * Nếu ngày đó trong năm nay đã qua quá 3 ngày (so với today),
 * tự động chuyển sang năm tiếp theo.
 */
function resolveDateWithYear(day, month, explicitYear, todayStr) {
    const todayParts = todayStr.split('-').map(Number);
    const currentYear = todayParts[0];

    const year = explicitYear ? Number(explicitYear) : currentYear;
    const formattedMonth = String(month).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    let dateStr = `${year}-${formattedMonth}-${formattedDay}`;

    if (!isValidDateOnly(dateStr)) return null;

    // Nếu không truyền năm và ngày này đã trôi qua trong năm nay -> chọn năm sau
    if (!explicitYear && dateStr < todayStr) {
        const nextYearDateStr = `${currentYear + 1}-${formattedMonth}-${formattedDay}`;
        if (isValidDateOnly(nextYearDateStr)) {
            dateStr = nextYearDateStr;
        }
    }

    return dateStr;
}

/**
 * Tìm ngày thứ Bảy và Chủ Nhật của tuần hiện tại
 */
function getWeekendDates(todayStr) {
    const d = parseDateString(todayStr);
    const dayOfWeek = d.getDay(); // 0: CN, 1: T2, ..., 6: T7
    let daysUntilSat = (6 - dayOfWeek + 7) % 7;
    if (daysUntilSat === 0 && dayOfWeek !== 6) daysUntilSat = 7;

    const sat = new Date(d);
    sat.setDate(sat.getDate() + daysUntilSat);
    const sun = new Date(sat);
    sun.setDate(sun.getDate() + 1);

    return {
        checkIn: toDateString(sat),
        checkOut: toDateString(sun),
    };
}

/**
 * Phân tích ngày nhận phòng và ngày trả phòng từ chuỗi văn bản.
 *
 * @param {string} text - Tin nhắn của người dùng
 * @param {Array}  history - Lịch sử hội thoại (optional)
 * @param {string} referenceToday - Ngày mốc (YYYY-MM-DD), mặc định là hôm nay
 * @returns {{
 *   hasDates: boolean,
 *   checkIn: string|null,
 *   checkOut: string|null,
 *   nights: number|null,
 *   error: 'PAST_DATE'|'INVALID_RANGE'|'TOO_LONG'|null,
 *   raw: string|null
 * }}
 */
function extractDateRange(text, history = [], referenceToday = null) {
    if (!text || typeof text !== 'string') {
        return { hasDates: false, checkIn: null, checkOut: null, nights: null, error: null, raw: null };
    }

    const todayStr = referenceToday || getTodayDateOnly();
    const todayDate = parseDateString(todayStr);

    let checkIn = null;
    let checkOut = null;
    let rawMatch = null;

    const lower = text.toLowerCase().trim();

    // ============================================================
    // 1. DẠNG: "cuối tuần này" hoặc "cuối tuần"
    // ============================================================
    if (lower.includes('cuối tuần này') || lower.includes('cuối tuần')) {
        const weekend = getWeekendDates(todayStr);
        checkIn = weekend.checkIn;
        checkOut = weekend.checkOut;
        rawMatch = 'cuối tuần';
    }

    // ============================================================
    // 2. DẠNG: "từ [day1] đến [day2] tháng [month] [năm [year]]"
    //    hoặc: "từ ngày [day1] đến ngày [day2] tháng [month]"
    // ============================================================
    if (!checkIn) {
        const patternRangeInMonth =
            /(?:từ\s+(?:ngày\s+)?)?(\d{1,2})\s*(?:đến|tới|-|–|sang)\s*(?:ngày\s+)?(\d{1,2})\s*tháng\s*(\d{1,2})(?:\s*năm\s*(\d{4}))?/i;
        const match = lower.match(patternRangeInMonth);
        if (match) {
            const [, d1, d2, m, y] = match;
            checkIn = resolveDateWithYear(d1, m, y, todayStr);
            checkOut = resolveDateWithYear(d2, m, y, todayStr);
            rawMatch = match[0];
        }
    }

    // ============================================================
    // 3. DẠNG: "ngày [d1] tháng [m1] [năm y1] đến ngày [d2] tháng [m2] [năm y2]"
    // ============================================================
    if (!checkIn) {
        const patternTwoFullDates =
            /(?:ngày\s*)?(\d{1,2})\s*tháng\s*(\d{1,2})(?:\s*năm\s*(\d{4}))?\s*(?:đến|tới|-|–|sang)\s*(?:ngày\s*)?(\d{1,2})\s*tháng\s*(\d{1,2})(?:\s*năm\s*(\d{4}))?/i;
        const match = lower.match(patternTwoFullDates);
        if (match) {
            const [, d1, m1, y1, d2, m2, y2] = match;
            checkIn = resolveDateWithYear(d1, m1, y1, todayStr);
            checkOut = resolveDateWithYear(d2, m2, y2 || y1, todayStr);
            rawMatch = match[0];
        }
    }

    // ============================================================
    // 4. DẠNG: ISO format: YYYY-MM-DD đến YYYY-MM-DD
    // ============================================================
    if (!checkIn) {
        const patternIso =
            /(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s*(?:đến|tới|-|–|to)\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i;
        const match = lower.match(patternIso);
        if (match) {
            const d1 = match[1].replace(/\//g, '-');
            const d2 = match[2].replace(/\//g, '-');
            if (isValidDateOnly(d1) && isValidDateOnly(d2)) {
                checkIn = d1;
                checkOut = d2;
                rawMatch = match[0];
            }
        }
    }

    // ============================================================
    // 5. DẠNG CHUẨN: "DD/MM[/YYYY] đến DD/MM[/YYYY]"
    //    hoặc: "từ DD/MM đến DD/MM"
    // ============================================================
    if (!checkIn) {
        const patternDateSlash =
            /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?\s*(?:đến|tới|sang|-|–|\/|to)\s*(?:ngày\s*)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/i;
        const match = lower.match(patternDateSlash);
        if (match) {
            const [, d1, m1, y1, d2, m2, y2] = match;
            checkIn = resolveDateWithYear(d1, m1, y1, todayStr);
            checkOut = resolveDateWithYear(d2, m2, y2 || y1, todayStr);
            rawMatch = match[0];
        }
    }

    // ============================================================
    // 6. DẠNG: Checkin/Checkout từ khóa
    //    VD: "checkin 10/11 checkout 12/11", "nhận phòng 10/11 trả phòng 12/11"
    // ============================================================
    if (!checkIn) {
        const patternCheckInCheckOut =
            /(?:check[- ]?in|nhận phòng)\s*(?:ngày\s*)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?.*?(?:check[- ]?out|trả phòng)\s*(?:ngày\s*)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/i;
        const match = lower.match(patternCheckInCheckOut);
        if (match) {
            const [, d1, m1, y1, d2, m2, y2] = match;
            checkIn = resolveDateWithYear(d1, m1, y1, todayStr);
            checkOut = resolveDateWithYear(d2, m2, y2 || y1, todayStr);
            rawMatch = match[0];
        }
    }

    // ============================================================
    // 7. DẠNG TƯƠNG ĐỐI: "ngày mai đến ngày kia/mốt", "hôm nay đến ngày mai"
    // ============================================================
    if (!checkIn) {
        const relativeWords = {
            'hôm nay': 0,
            'tối nay': 0,
            'ngày mai': 1,
            'sáng mai': 1,
            'tối mai': 1,
            'ngày mốt': 2,
            'ngày kia': 2,
        };

        const relPattern =
            /(hôm nay|tối nay|ngày mai|sáng mai|tối mai|ngày mốt|ngày kia)\s*(?:đến|tới|-|–|sang)\s*(hôm nay|tối nay|ngày mai|sáng mai|tối mai|ngày mốt|ngày kia)/i;
        const relMatch = lower.match(relPattern);
        if (relMatch) {
            const offset1 = relativeWords[relMatch[1]];
            const offset2 = relativeWords[relMatch[2]];
            checkIn = addDays(todayDate, offset1);
            checkOut = addDays(todayDate, offset2);
            rawMatch = relMatch[0];
        }
    }

    // ============================================================
    // 8. DẠNG: "[Ngày/Từ tương đối] ở [N] đêm/ngày"
    //    VD: "ngày mai ở 2 đêm", "từ 10/11 ở 3 đêm", "hôm nay ở 1 đêm"
    // ============================================================
    if (!checkIn) {
        const stayDurationPattern =
            /(?:từ\s+)?(hôm nay|tối nay|ngày mai|ngày mốt|ngày kia|(?:\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{4})?)|(?:ngày\s*\d{1,2}\s*tháng\s*\d{1,2}))\s*(?:ở|thuê|lưu trú|trong)?\s*(\d+)\s*(?:đêm|ngày)/i;
        const match = lower.match(stayDurationPattern);
        if (match) {
            const startRaw = match[1];
            const nightsCount = parseInt(match[2], 10);
            let parsedStart = null;

            if (startRaw === 'hôm nay' || startRaw === 'tối nay') {
                parsedStart = todayStr;
            } else if (startRaw === 'ngày mai') {
                parsedStart = addDays(todayDate, 1);
            } else if (startRaw === 'ngày mốt' || startRaw === 'ngày kia') {
                parsedStart = addDays(todayDate, 2);
            } else if (startRaw.includes('tháng')) {
                const tm = startRaw.match(/(\d{1,2})\s*tháng\s*(\d{1,2})/);
                if (tm) parsedStart = resolveDateWithYear(tm[1], tm[2], null, todayStr);
            } else {
                const sm = startRaw.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/);
                if (sm) parsedStart = resolveDateWithYear(sm[1], sm[2], sm[3], todayStr);
            }

            if (parsedStart && nightsCount > 0 && nightsCount <= 30) {
                checkIn = parsedStart;
                checkOut = addDays(parsedStart, nightsCount);
                rawMatch = match[0];
            }
        }
    }

    // ============================================================
    // 9. DẠNG ĐƠN: Hỏi riêng 1 ngày (VD: "ngày 10/11 còn phòng không?", "ngày mai còn phòng không?")
    //    Mặc định lưu trú 1 đêm (checkOut = checkIn + 1 ngày)
    // ============================================================
    if (!checkIn) {
        // Ngày mai / hôm nay
        if (lower.includes('ngày mai')) {
            checkIn = addDays(todayDate, 1);
            checkOut = addDays(todayDate, 2);
            rawMatch = 'ngày mai';
        } else if (lower.includes('hôm nay') || lower.includes('tối nay')) {
            checkIn = todayStr;
            checkOut = addDays(todayDate, 1);
            rawMatch = 'hôm nay';
        } else {
            // Ngày DD/MM[/YYYY]
            const singleDateSlash =
                /(?:ngày\s+)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/i;
            const match = lower.match(singleDateSlash);
            if (match) {
                const [, d, m, y] = match;
                const dateParsed = resolveDateWithYear(d, m, y, todayStr);
                if (dateParsed) {
                    checkIn = dateParsed;
                    checkOut = addDays(dateParsed, 1);
                    rawMatch = match[0];
                }
            } else {
                // Ngày D tháng M
                const singleDateText =
                    /ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})(?:\s*năm\s*(\d{4}))?/i;
                const matchText = lower.match(singleDateText);
                if (matchText) {
                    const [, d, m, y] = matchText;
                    const dateParsed = resolveDateWithYear(d, m, y, todayStr);
                    if (dateParsed) {
                        checkIn = dateParsed;
                        checkOut = addDays(dateParsed, 1);
                        rawMatch = matchText[0];
                    }
                }
            }
        }
    }

    // Nếu không tìm thấy trong câu hiện tại, thử tìm trong lượt chat trước nếu phù hợp
    if (!checkIn && Array.isArray(history) && history.length > 0) {
        // Chỉ tìm trong tin nhắn user gần nhất nếu tin nhắn hiện tại có tính khẳng định/ngắn
        const lastUserEntry = [...history].reverse().find((h) => h.role === 'user');
        if (lastUserEntry && typeof lastUserEntry.parts?.[0]?.text === 'string') {
            const lastText = lastUserEntry.parts[0].text;
            // Kiểm tra xem message hiện tại có thể là câu bổ trợ không
            if (lower.length < 15 && (lower.includes('được') || lower.includes('ok') || lower.includes('phòng'))) {
                return extractDateRange(lastText, [], todayStr);
            }
        }
    }

    // Nếu hoàn toàn không có ngày
    if (!checkIn || !checkOut) {
        return {
            hasDates: false,
            checkIn: null,
            checkOut: null,
            nights: null,
            error: null,
            raw: null,
        };
    }

    // ============================================================
    // VALIDATION
    // ============================================================
    const nights = calculateNights(checkIn, checkOut);

    if (checkIn < todayStr) {
        return {
            hasDates: true,
            checkIn,
            checkOut,
            nights,
            error: 'PAST_DATE',
            raw: rawMatch,
        };
    }

    if (checkIn >= checkOut || nights <= 0) {
        return {
            hasDates: true,
            checkIn,
            checkOut,
            nights,
            error: 'INVALID_RANGE',
            raw: rawMatch,
        };
    }

    if (nights > 30) {
        return {
            hasDates: true,
            checkIn,
            checkOut,
            nights,
            error: 'TOO_LONG',
            raw: rawMatch,
        };
    }

    return {
        hasDates: true,
        checkIn,
        checkOut,
        nights,
        error: null,
        raw: rawMatch,
    };
}

module.exports = {
    extractDateRange,
    addDays,
    getWeekendDates,
};

