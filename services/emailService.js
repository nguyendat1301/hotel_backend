const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendBookingConfirmation = async (email, bookingDetails) => {
  try {
    const formatVND = (amount) =>
      new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);

    const roomsList = Array.isArray(bookingDetails.rooms) && bookingDetails.rooms.length > 0
      ? bookingDetails.rooms
      : [
          {
            roomNumber: bookingDetails.roomNumber || "N/A",
            roomName: bookingDetails.roomName || "Tiêu chuẩn",
            guestCount: bookingDetails.guestCount || 1,
            pricePerNight: bookingDetails.pricePerNight || bookingDetails.totalPrice,
            subtotal: bookingDetails.totalPrice,
          },
        ];

    const roomsTableHtml = roomsList
      .map(
        (r) => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px; font-weight: bold; color: #2c3e50;">Phòng ${r.roomNumber}</td>
          <td style="padding: 10px; color: #555;">${r.roomName || "Phòng"}</td>
          <td style="padding: 10px; text-align: center; color: #555;">${r.guestCount} khách</td>
          <td style="padding: 10px; text-align: right; color: #555;">${formatVND(r.pricePerNight)}</td>
          <td style="padding: 10px; text-align: right; font-weight: bold; color: #2c3e50;">${formatVND(r.subtotal)}</td>
        </tr>
      `
      )
      .join("");

    const mailOptions = {
      from: `"LakeSide Hotel" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `🏨 Xác nhận đơn đặt phòng #${bookingDetails.bookingId} - LakeSide Hotel`,
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 32px 20px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 800;">XÁC NHẬN ĐẶT PHÒNG</h1>
            <p style="opacity: 0.9; margin-top: 8px; font-size: 14px;">Cảm ơn bạn đã lựa chọn LakeSide Hotel</p>
          </div>

          <!-- Body -->
          <div style="padding: 30px; color: #334155; line-height: 1.6;">
            <p style="font-size: 16px;">Chào <strong>${bookingDetails.customerName || "quý khách"}</strong>,</p>
            <p>Đơn đặt phòng của bạn đã được hệ thống ghi nhận thành công. Dưới đây là thông tin chi tiết cho kỳ nghỉ sắp tới:</p>

            <!-- Order Overview Box -->
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Mã đơn hàng</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #1e3a8a; font-size: 15px;">#${bookingDetails.bookingId}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Thời gian lưu trú</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #0f172a;">
                  ${new Date(bookingDetails.checkInDate).toLocaleDateString("vi-VN")} → ${new Date(bookingDetails.checkOutDate).toLocaleDateString("vi-VN")}
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Tổng số phòng</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f172a;">${roomsList.length} phòng</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; color: #64748b; font-size: 14px;">Trạng thái thanh toán</td>
                <td style="padding: 12px 16px; text-align: right;">
                  <span style="background-color: ${bookingDetails.paymentStatus === "PAID" ? "#dcfce7" : "#fef3c7"}; color: ${bookingDetails.paymentStatus === "PAID" ? "#166534" : "#92400e"}; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; display: inline-block;">
                    ${bookingDetails.paymentStatus === "PAID" ? "ĐÃ THANH TOÁN ĐỦ" : "ĐÃ ĐẶT CỌC 50%"}
                  </span>
                </td>
              </tr>
            </table>

            <!-- Room List Table -->
            <h3 style="color: #0f172a; margin-top: 25px; margin-bottom: 10px; font-size: 16px; font-weight: 700;">Danh sách phòng đặt</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
              <thead>
                <tr style="background-color: #f1f5f9; text-align: left; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 11px;">
                  <th style="padding: 10px;">Phòng</th>
                  <th style="padding: 10px;">Hạng phòng</th>
                  <th style="padding: 10px; text-align: center;">Khách</th>
                  <th style="padding: 10px; text-align: right;">Đơn giá</th>
                  <th style="padding: 10px; text-align: right;">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                ${roomsTableHtml}
              </tbody>
              <tfoot>
                <tr style="font-size: 16px; border-top: 2px solid #cbd5e1;">
                  <td colspan="4" style="padding: 15px 10px; font-weight: bold; color: #0f172a;">Tổng tiền đơn hàng:</td>
                  <td style="padding: 15px 10px; text-align: right; color: #ea580c; font-weight: 800;">
                    ${formatVND(bookingDetails.totalPrice)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div style="padding: 16px; border-left: 4px solid #3b82f6; background-color: #eff6ff; font-size: 13px; color: #1e40af; border-radius: 4px; margin-top: 20px;">
              <strong>Lưu ý nhận phòng:</strong> Quý khách vui lòng mang theo CMND/CCCD hoặc Hộ chiếu trùng khớp với thông tin đã đăng ký khi làm thủ tục nhận phòng. Giờ check-in tiêu chuẩn là 14:00, check-out là 12:00.
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            <p style="margin: 4px 0;">Hotline hỗ trợ: <strong>0123 456 789</strong> | Email: <strong>support@lakesidehotel.vn</strong></p>
            <p style="margin: 4px 0;">Địa chỉ: 123 Đường Hồ Tây, Quận Tây Hồ, Hà Nội, Việt Nam</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending email: ", error);
    return false;
  }
};


const sendResetPasswordEmail = async (to, resetLink) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0;">
      <div style="background-color: #1a73e8; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Hệ Thống Hotel</h1>
      </div>
      
      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="color: #333;">Khôi phục mật khẩu</h2>
        <p>Xin chào,</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng nhấn vào nút bên dưới để tiến hành thay đổi mật khẩu:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #1a73e8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
             Đặt lại mật khẩu ngay
          </a>
        </div>
        
        <p style="font-size: 0.9em; color: #666;">
          Nếu nút trên không hoạt động, bạn có thể copy và dán đường dẫn này vào trình duyệt: <br>
          <a href="${resetLink}" style="color: #1a73e8;">${resetLink}</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        
        <p style="font-size: 0.8em; color: #999;">
          Nếu bạn không yêu cầu thay đổi này, hãy bỏ qua email này. Tài khoản của bạn vẫn sẽ được bảo mật.
        </p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #777;">
        &copy; ${new Date().getFullYear()} Hotel System. All rights reserved. <br>
        Địa chỉ: 123 Đường ABC, Quận 1, TP. Hồ Chí Minh
      </div>
    </div>
  `;

  return transporter.sendMail({
    from: `"LakeSide Hotel" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Yêu cầu khôi phục mật khẩu",
    html: htmlContent,
  });
};

module.exports = {
  sendBookingConfirmation,
  sendResetPasswordEmail,
};
