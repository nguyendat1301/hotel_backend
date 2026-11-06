/**
 * hotel_knowledge.js
 *
 * Dữ liệu tĩnh của khách sạn LakeSide Hotel, được chia thành các chunk nhỏ
 * phục vụ RAG (Retrieval-Augmented Generation).
 *
 * Mỗi chunk có:
 *   - chunk_id  : Định danh duy nhất (không thay đổi để tránh insert trùng)
 *   - category  : Phân loại (faq, policy, room, service, contact)
 *   - title     : Tiêu đề ngắn hiển thị cho người dùng (sources)
 *   - content   : Nội dung đầy đủ (~150-350 từ, tối ưu cho embedding)
 *
 * Để thêm thông tin mới: thêm chunk vào mảng và chạy lại `node scripts/ingest.js`
 */

const HOTEL_KNOWLEDGE_CHUNKS = [

    // ========== CONTACT ==========
    {
        chunk_id: 'contact-overview',
        category: 'contact',
        title: 'Thông tin liên hệ LakeSide Hotel',
        content: `LakeSide Hotel tọa lạc tại Thành phố Hà Nội, Việt Nam.
Lễ tân hoạt động 24/7, luôn sẵn sàng hỗ trợ quý khách.
Điện thoại lễ tân: +84 (0) 24 3456 7890.
Email hỗ trợ: info@lakesidehotel.vn
Website đặt phòng: lakesidehotel.vn
Địa chỉ: 123 Đường Xuân Diệu , Quận Tây Hồ, TP. Hà Nội, Việt Nam.`,
    },
    {
        chunk_id: 'contact-checkin-hours',
        category: 'contact',
        title: 'Giờ nhận phòng và trả phòng',
        content: `Giờ nhận phòng (Check-in): 14:00 (2 giờ chiều).
Giờ trả phòng (Check-out): 12:00 (12 giờ trưa).
Nếu quý khách đến sớm hơn 14:00, chúng tôi sẽ giữ hành lý miễn phí trong khi chờ phòng sẵn sàng.
Nếu có yêu cầu nhận phòng sớm (early check-in) hoặc trả phòng muộn (late check-out), quý khách vui lòng liên hệ lễ tân trước ít nhất 24 giờ. Phí phụ thu có thể phát sinh tùy thuộc vào tình trạng phòng.`,
    },
    {
        chunk_id: 'contact-working-hours',
        category: 'contact',
        title: 'Giờ hoạt động các dịch vụ',
        content: `Lễ tân: 24/7 (cả ngày lẫn đêm).
Nhà hàng: 6:00 sáng – 22:00 tối (phục vụ bữa sáng, trưa, tối).
Hồ bơi ngoài trời: 7:00 sáng – 21:00 tối.
Trung tâm Spa & Wellness: 9:00 sáng – 21:00 tối.
Phòng Gym & Fitness: 6:00 sáng – 22:00 tối.
Dịch vụ phòng (Room Service): 24/7.
Dịch vụ đưa đón sân bay: Đặt trước ít nhất 2 tiếng.`,
    },

    // ========== FAQ ==========
    {
        chunk_id: 'faq-wifi',
        category: 'faq',
        title: 'WiFi tại khách sạn',
        content: `LakeSide Hotel cung cấp WiFi tốc độ cao miễn phí trong toàn bộ khu vực khách sạn, bao gồm phòng nghỉ, khu vực công cộng, nhà hàng, hồ bơi và hội trường.
Cách kết nối: Chọn mạng "LakeSide_Hotel_Free" và nhập mã được in trên thẻ chào mừng (welcome card) trong phòng, hoặc nhờ nhân viên lễ tân cung cấp mật khẩu.`,
    },
    {
        chunk_id: 'faq-parking',
        category: 'faq',
        title: 'Bãi đỗ xe',
        content: `LakeSide Hotel có bãi đỗ xe riêng miễn phí dành cho khách lưu trú. Bãi đỗ xe hoạt động 24/7 với nhân viên bảo vệ trực.
Khách vãng lai (không lưu trú) đậu xe tính phí theo giờ. Liên hệ lễ tân để biết thêm thông tin.`,
    },
    {
        chunk_id: 'faq-luggage',
        category: 'faq',
        title: 'Dịch vụ giữ hành lý',
        content: `Khách sạn cung cấp dịch vụ giữ hành lý miễn phí cho quý khách lưu trú.
Dịch vụ này đặc biệt hữu ích khi quý khách đến sớm hơn giờ nhận phòng (trước 14:00) hoặc cần ở lại sau giờ trả phòng (sau 12:00) để tham quan thành phố.
Vui lòng gửi hành lý tại quầy lễ tân và nhận phiếu giữ hành lý.`,
    },
    {
        chunk_id: 'faq-children',
        category: 'faq',
        title: 'Chính sách trẻ em',
        content: `Trẻ em dưới 6 tuổi được ở miễn phí khi dùng chung giường với bố mẹ (không cần giường phụ).
Trẻ em từ 6 tuổi trở lên được tính như người lớn theo số lượng khách trong phòng.
Nếu cần giường phụ (extra bed) hoặc cũi trẻ em (baby cot), vui lòng thông báo khi đặt phòng. Phí phụ thu tùy loại phòng.`,
    },
    {
        chunk_id: 'faq-payment',
        category: 'faq',
        title: 'Phương thức thanh toán',
        content: `LakeSide Hotel chấp nhận các hình thức thanh toán sau:
- Tiền mặt (VNĐ và một số ngoại tệ phổ biến).
- Thẻ tín dụng/ghi nợ: Visa, Mastercard, JCB.
- Chuyển khoản ngân hàng (áp dụng cho đặt phòng doanh nghiệp).
- Thanh toán trực tuyến qua website (cổng thanh toán an toàn).
Hóa đơn VAT được xuất theo yêu cầu.`,
    },

    // ========== POLICY ==========
    {
        chunk_id: 'policy-cancellation',
        category: 'policy',
        title: 'Chính sách hủy đặt phòng',
        content: `Chính sách hủy phòng tại LakeSide Hotel:
- Hủy miễn phí: Trước 24 giờ so với giờ nhận phòng (14:00 ngày nhận phòng).
- Hủy trong vòng 24 giờ: Tính phí tương đương 1 đêm đầu tiên.
- Không đến (No-show): Tính phí toàn bộ đêm đầu tiên và có thể hủy booking.
Để hủy đặt phòng, quý khách có thể vào mục "Đơn đặt phòng của tôi" trên website hoặc liên hệ lễ tân qua điện thoại/email.`,
    },
    {
        chunk_id: 'policy-smoking',
        category: 'policy',
        title: 'Chính sách hút thuốc',
        content: `LakeSide Hotel là khách sạn không hút thuốc (non-smoking) trong toàn bộ khu vực trong nhà, bao gồm tất cả các phòng nghỉ, hành lang, nhà hàng, sảnh, hồ bơi và spa.
Khu vực hút thuốc ngoài trời: Có bố trí tại tầng trệt, gần lối ra vườn.
Phí phát sinh: Nếu phát hiện hút thuốc trong phòng, khách sạn có quyền tính phí vệ sinh đặc biệt từ 500.000 VNĐ.`,
    },
    {
        chunk_id: 'policy-pets',
        category: 'policy',
        title: 'Chính sách thú cưng',
        content: `LakeSide Hotel hiện không cho phép mang thú cưng vào khu vực khách sạn (kể cả phòng nghỉ và khu vực công cộng).
Chúng tôi xin lỗi vì sự bất tiện này và cam kết sẽ xem xét thay đổi chính sách trong tương lai. Nếu quý khách cần hỗ trợ tìm dịch vụ gửi thú cưng gần đó, lễ tân sẵn sàng tư vấn.`,
    },
    {
        chunk_id: 'policy-booking',
        category: 'policy',
        title: 'Quy trình đặt phòng',
        content: `Cách đặt phòng tại LakeSide Hotel:
1. Qua website: Vào trang đặt phòng, chọn ngày nhận/trả phòng, chọn loại phòng và xác nhận.
2. Qua điện thoại: Gọi đến lễ tân +84 (0) 24 3456 7890.
3. Qua email: Gửi yêu cầu đến info@lakesidehotel.vn.

Thông tin cần cung cấp: Ngày nhận phòng, ngày trả phòng, số người lớn, số trẻ em, loại phòng mong muốn.
Xác nhận đặt phòng sẽ được gửi qua email sau khi thanh toán thành công.`,
    },

    // ========== SERVICE ==========
    {
        chunk_id: 'service-restaurant',
        category: 'service',
        title: 'Nhà hàng và ẩm thực',
        content: `LakeSide Hotel có nhà hàng phục vụ cả ngày (all-day dining) với các bữa ăn:
- Bữa sáng (6:00 - 10:00): Buffet sáng phong phú với các món Việt và quốc tế.
- Bữa trưa (11:30 - 14:00): Thực đơn à la carte đa dạng.
- Bữa tối (18:00 - 22:00): Thực đơn đặc sản và các món hải sản tươi ngon.
Ngoài ra, dịch vụ phòng (room service) phục vụ 24/7 với thực đơn đầy đủ.`,
    },
    {
        chunk_id: 'service-pool',
        category: 'service',
        title: 'Hồ bơi ngoài trời',
        content: `Hồ bơi ngoài trời của LakeSide Hotel mang đến tầm nhìn tuyệt đẹp ra hồ nước xanh mát.
Giờ hoạt động: 7:00 sáng – 21:00 tối.
Dịch vụ tại hồ bơi: Ghế tắm nắng (sun lounger), dù che nắng, khăn tắm miễn phí, nhân viên phục vụ đồ uống.
Lưu ý: Trẻ em dưới 12 tuổi phải có người lớn đi kèm. Không được mang thức ăn từ bên ngoài vào khu vực hồ bơi.`,
    },
    {
        chunk_id: 'service-spa',
        category: 'service',
        title: 'Spa & Wellness Center',
        content: `Trung tâm Spa & Wellness của LakeSide Hotel cung cấp các dịch vụ thư giãn cao cấp:
- Massage body (toàn thân, 60 phút / 90 phút).
- Massage thư giãn chân và vai gáy.
- Chăm sóc da mặt (facial treatment).
- Tắm khoáng và thảo dược.
- Phòng sauna và xông hơi ướt.
Giờ hoạt động: 9:00 sáng – 21:00 tối (đặt lịch trước để đảm bảo có phòng).
Liên hệ lễ tân hoặc gọi trực tiếp cho bộ phận Spa để đặt lịch.`,
    },
    {
        chunk_id: 'service-gym',
        category: 'service',
        title: 'Phòng Gym & Fitness',
        content: `Phòng Gym & Fitness tại LakeSide Hotel trang bị đầy đủ máy móc hiện đại:
- Máy chạy bộ, xe đạp cố định, máy leo thang.
- Tạ tự do (dumbbells) và máy kéo cáp đa năng.
- Thảm yoga và khu vực tập thể dục nhẹ.
Giờ hoạt động: 6:00 sáng – 22:00 tối.
Miễn phí cho khách lưu trú. Khăn và nước uống được cung cấp.`,
    },
    {
        chunk_id: 'service-airport-transfer',
        category: 'service',
        title: 'Dịch vụ đưa đón sân bay',
        content: `LakeSide Hotel cung cấp dịch vụ đưa đón sân bay Tân Sơn Nhất (SGN) với xe chất lượng cao và tài xế chuyên nghiệp.
Cách đặt: Liên hệ lễ tân ít nhất 2 giờ trước giờ cần xe, cung cấp thông tin chuyến bay và số điện thoại liên lạc.
Phí dịch vụ: Liên hệ lễ tân để biết giá hiện tại (tùy loại xe và thời điểm).
Xe sẽ đón quý khách tại cửa ra đón (Arrival hall) hoặc đưa đến sân bay đúng giờ.`,
    },
    {
        chunk_id: 'service-meeting',
        category: 'service',
        title: 'Phòng họp và hội nghị',
        content: `LakeSide Hotel có các phòng họp và hội trường phù hợp cho nhiều quy mô sự kiện:
- Phòng họp nhỏ: 10-20 người (trang bị máy chiếu, bảng trắng, WiFi).
- Phòng hội nghị lớn: 50-200 người (âm thanh, ánh sáng chuyên nghiệp).
- Dịch vụ tiệc và catering tại chỗ.
Để đặt phòng họp hoặc tổ chức sự kiện, liên hệ bộ phận Sales & Events qua email: events@lakesidehotel.vn hoặc lễ tân.`,
    },

    // ========== ROOM (Thông tin chung về phòng - không có giá cụ thể) ==========
    {
        chunk_id: 'room-overview',
        category: 'room',
        title: 'Tổng quan các loại phòng',
        content: `LakeSide Hotel cung cấp nhiều loại phòng để đáp ứng nhu cầu đa dạng của quý khách.
Thông tin chi tiết về từng loại phòng (tên, giá, sức chứa, tiện nghi) được lấy trực tiếp từ hệ thống đặt phòng để đảm bảo luôn cập nhật chính xác nhất.
Tất cả các phòng đều bao gồm: WiFi miễn phí tốc độ cao, điều hòa không khí, TV màn hình phẳng, minibar, két an toàn, bộ đồ vệ sinh cao cấp.
Quý khách có thể hỏi trực tiếp trợ lý AI về tình trạng phòng trống theo ngày cụ thể (ví dụ: 'Còn phòng từ 10/11 đến 12/11 không?'), hoặc sử dụng công cụ tìm kiếm phòng trên website.`,
    },
];

module.exports = { HOTEL_KNOWLEDGE_CHUNKS };

