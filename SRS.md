# Software Requirements Specification (SRS)

## Dự án: AURA ARCHIVE

- Phiên bản tài liệu: `1.0`
- Ngày cập nhật: `2026-04-10`
- Trạng thái: `Draft for thesis/report use`
- Phạm vi tài liệu: bám theo mã nguồn hiện có trong repo `KLTN`

---

## 1. Giới thiệu

### 1.1 Mục đích

Tài liệu này mô tả đặc tả yêu cầu phần mềm cho hệ thống `AURA ARCHIVE`, một nền tảng thương mại điện tử thời trang cao cấp theo mô hình resale/consignment. Mục tiêu của SRS là:

- Làm rõ phạm vi và chức năng của hệ thống.
- Xác định actor, luồng nghiệp vụ và ràng buộc vận hành.
- Làm cơ sở cho phát triển, kiểm thử, bảo trì và viết báo cáo khóa luận.
- Đồng bộ tài liệu với tình trạng triển khai thực tế của dự án.

### 1.2 Phạm vi hệ thống

Hệ thống cho phép:

- Khách truy cập duyệt sản phẩm thời trang, tìm kiếm, lọc và xem chi tiết.
- Khách hàng đăng ký, đăng nhập, quản lý hồ sơ, địa chỉ, wishlist và lịch sử đơn hàng.
- Người dùng thêm sản phẩm vào giỏ, checkout và thanh toán trực tuyến.
- Người dùng tương tác với `AI Stylist` bằng chat và voice để được tư vấn mua sắm.
- Quản trị viên quản lý sản phẩm, biến thể, đơn hàng, người dùng, coupon, review, blog, banner, popup, cấu hình AI và phiên chat.

### 1.3 Đối tượng sử dụng tài liệu

- Giảng viên hướng dẫn, hội đồng bảo vệ.
- Nhóm phát triển frontend/backend.
- Người viết kiểm thử và tài liệu kỹ thuật.
- Người quản trị hệ thống.

### 1.4 Tài liệu tham chiếu

- [README.md](README.md)
- [PROJECT_ANALYSIS.md](PROJECT_ANALYSIS.md)
- [client/package.json](client/package.json)
- [server/package.json](server/package.json)
- [server/server.js](server/server.js)

### 1.5 Thuật ngữ và từ viết tắt

| Thuật ngữ | Giải thích |
|---|---|
| SRS | Software Requirements Specification |
| SSR | Server-Side Rendering |
| JWT | JSON Web Token |
| OTP | One-Time Password |
| AI Stylist | Trợ lý AI tư vấn sản phẩm và phong cách |
| Admin | Người quản trị hệ thống |
| Customer | Người dùng đã đăng ký tài khoản |
| Guest | Người dùng chưa đăng nhập |

---

## 2. Mô tả tổng quan

### 2.1 Bối cảnh sản phẩm

`AURA ARCHIVE` là website thương mại điện tử thời trang cao cấp, tập trung vào trải nghiệm mua sắm có tính tư vấn cá nhân hóa. Hệ thống kết hợp chức năng e-commerce truyền thống với trợ lý AI để tăng tỷ lệ chuyển đổi và hỗ trợ khám phá sản phẩm.

### 2.2 Kiến trúc tổng thể

Kiến trúc thực tế hiện tại của repo gồm:

- `Frontend`: Nuxt 3 + Vue 3 + Tailwind CSS.
- `Backend`: Express.js + Sequelize.
- `Database`: PostgreSQL.
- `AI integration`: xử lý qua backend routes/services, không có service Python tách riêng trong repo hiện tại.

Luồng tổng quát:

1. Người dùng truy cập frontend Nuxt.
2. Frontend gọi REST API tại backend Express.
3. Backend xử lý nghiệp vụ, truy cập PostgreSQL qua Sequelize.
4. Với chat/voice AI, backend gọi dịch vụ AI bên ngoài thông qua service nội bộ.
5. Kết quả được trả về frontend để hiển thị theo thời gian thực hoặc theo request/response.

### 2.3 Mục tiêu nghiệp vụ

- Xây dựng một nền tảng bán hàng thời trang cao cấp có trải nghiệm hiện đại.
- Tăng khả năng khám phá sản phẩm bằng AI.
- Tối ưu quy trình quản trị nội dung, đơn hàng và khách hàng.
- Hỗ trợ thanh toán nhiều cổng phù hợp thị trường Việt Nam và quốc tế.

### 2.4 Actor

| Actor | Mô tả |
|---|---|
| Guest | Xem sản phẩm, xem blog, chat AI, đăng ký, đăng nhập |
| Customer | Mua hàng, thanh toán, đánh giá, wishlist, quản lý tài khoản |
| Admin | Quản trị toàn bộ dữ liệu và cấu hình hệ thống |
| Payment Gateway | VNPay, MoMo, PayPal |
| OAuth Provider | Google, Facebook |
| Email Service | Gửi OTP, quên mật khẩu, thông báo |
| AI Provider | Xử lý chat và voice assistant |

### 2.5 Ràng buộc triển khai

- Frontend dùng Nuxt 3, Vue 3, Pinia.
- Backend dùng Express 4, Sequelize, PostgreSQL.
- Xác thực dùng JWT.
- Hệ thống yêu cầu internet để hoạt động với cổng thanh toán, OAuth và AI.
- Dữ liệu media được upload qua backend và dịch vụ lưu trữ cấu hình sẵn.

### 2.6 Giả định và phụ thuộc

- Người dùng có trình duyệt hiện đại hỗ trợ JavaScript.
- Môi trường triển khai có PostgreSQL đang hoạt động.
- Các biến môi trường cho auth, payment, email và AI được cấu hình đúng.
- Kết nối microphone được người dùng cấp quyền khi sử dụng voice chat.

---

## 3. Yêu cầu chức năng

### 3.1 Nhóm chức năng phía khách truy cập và khách hàng

#### FR-01. Quản lý tài khoản và xác thực

Hệ thống phải cho phép:

- Đăng ký tài khoản mới.
- Xác thực tài khoản bằng OTP.
- Gửi lại OTP khi cần.
- Đăng nhập bằng email và mật khẩu.
- Đăng nhập bằng Google hoặc Facebook.
- Quên mật khẩu và đặt lại mật khẩu.
- Thay đổi mật khẩu khi đã đăng nhập.
- Lấy thông tin người dùng hiện tại.

#### FR-02. Quản lý hồ sơ người dùng

Hệ thống phải cho phép người dùng đã đăng nhập:

- Xem hồ sơ cá nhân.
- Cập nhật họ tên, thông tin liên hệ và dữ liệu hồ sơ.
- Xem lịch sử đơn hàng.
- Xem chi tiết từng đơn hàng.

#### FR-03. Quản lý địa chỉ giao hàng

Hệ thống phải cho phép người dùng:

- Xem danh sách địa chỉ.
- Tạo địa chỉ mới.
- Chỉnh sửa địa chỉ.
- Xóa địa chỉ.
- Đặt một địa chỉ làm mặc định.
- Lấy địa chỉ mặc định để dùng cho checkout.

#### FR-04. Duyệt và khám phá sản phẩm

Hệ thống phải cho phép:

- Xem danh sách sản phẩm.
- Xem sản phẩm nổi bật, mới về, bán chạy, sale.
- Xem danh mục và thương hiệu.
- Lọc sản phẩm theo các tiêu chí phù hợp.
- Xem chi tiết sản phẩm.
- Xem sản phẩm liên quan.
- So sánh sản phẩm trên giao diện người dùng.

#### FR-05. Tìm kiếm và hỗ trợ duyệt nội dung

Hệ thống phải hỗ trợ:

- Tìm kiếm sản phẩm.
- Tìm kiếm theo từ khóa hoặc thuộc tính liên quan.
- Xem blog và danh mục blog.
- Xem banner, popup và nội dung marketing đang kích hoạt.

#### FR-06. Wishlist

Hệ thống phải cho phép người dùng đã đăng nhập:

- Xem wishlist.
- Thêm sản phẩm vào wishlist.
- Xóa sản phẩm khỏi wishlist.
- Kiểm tra một sản phẩm đã nằm trong wishlist hay chưa.

#### FR-07. Review và đánh giá sản phẩm

Hệ thống phải cho phép:

- Xem danh sách review của sản phẩm.
- Xem thống kê rating của sản phẩm.
- Đánh dấu review hữu ích.
- Kiểm tra điều kiện được đánh giá.
- Tạo, sửa và xóa review khi đã đăng nhập.

#### FR-08. Giỏ hàng và checkout

Hệ thống phải cho phép:

- Thêm sản phẩm vào giỏ hàng.
- Cập nhật số lượng hoặc loại bỏ sản phẩm trong giỏ.
- Kiểm tra tồn kho trước khi checkout.
- Tạo đơn hàng từ giỏ hàng.
- Hủy đơn hàng trong các trạng thái phù hợp.

#### FR-09. Vận chuyển và địa lý

Hệ thống phải hỗ trợ:

- Tính phí vận chuyển.
- Lấy bảng phí vận chuyển.
- Lấy danh sách tỉnh/thành.
- Lấy danh sách quận/huyện theo tỉnh.
- Tìm kiếm địa điểm phục vụ nhập địa chỉ nhanh hơn.

#### FR-10. Thanh toán

Hệ thống phải cho phép thanh toán qua:

- VNPay.
- MoMo.
- PayPal.

Hệ thống phải hỗ trợ:

- Tạo giao dịch thanh toán.
- Xử lý trang/luồng callback trả về từ cổng thanh toán.
- Nhận IPN hoặc webhook từ cổng thanh toán để đồng bộ trạng thái.

#### FR-11. Liên hệ và newsletter

Hệ thống phải cho phép:

- Gửi form liên hệ từ khách truy cập.
- Đăng ký nhận newsletter.
- Hủy đăng ký newsletter.

#### FR-12. AI Stylist chat

Hệ thống phải hỗ trợ:

- Hiển thị widget AI trên giao diện khách hàng.
- Trả lời hội thoại tư vấn sản phẩm.
- Tạo greeting message cho phiên đầu.
- Lưu lịch sử chat theo session.
- Lấy lại lịch sử chat theo session.
- Cấu hình giao diện chat từ dữ liệu quản trị.
- Hoạt động với cả guest và customer.

#### FR-13. AI Stylist voice

Hệ thống phải hỗ trợ:

- Bắt đầu voice session từ giao diện người dùng.
- Cấp token hoặc cấu hình voice qua backend.
- Gửi transcript/tool call về backend khi đang thoại.
- Đồng bộ transcript hội thoại.
- Cho phép thu nhỏ/phóng to voice widget để người dùng vừa nghe tư vấn vừa xem sản phẩm.

### 3.2 Nhóm chức năng phía quản trị

#### FR-14. Dashboard quản trị

Admin phải có khả năng:

- Xem thống kê tổng quan.
- Xem doanh thu theo tháng.
- Xem các chỉ số phục vụ vận hành.

#### FR-15. Quản lý đơn hàng

Admin phải có khả năng:

- Xem danh sách đơn hàng.
- Xem đơn hàng gần đây.
- Xem chi tiết đơn hàng.
- Cập nhật trạng thái đơn hàng.
- In thông tin đơn hàng ở giao diện quản trị.

#### FR-16. Quản lý sản phẩm và biến thể

Admin phải có khả năng:

- Tạo sản phẩm.
- Cập nhật sản phẩm.
- Xóa sản phẩm.
- Xem chi tiết sản phẩm quản trị.
- Quản lý biến thể theo sản phẩm.
- Cập nhật trạng thái biến thể.
- Upload ảnh sản phẩm.

#### FR-17. Quản lý người dùng

Admin phải có khả năng:

- Xem danh sách người dùng.
- Xem chi tiết người dùng.
- Khóa/mở trạng thái người dùng.
- Xóa người dùng theo quyền quản trị.

#### FR-18. Quản lý review

Admin phải có khả năng:

- Xem toàn bộ review.
- Kiểm duyệt review.
- Xóa review vi phạm.

#### FR-19. Quản lý coupon

Admin phải có khả năng:

- Tạo coupon.
- Sửa coupon.
- Xóa coupon.
- Xem thống kê sử dụng coupon.

#### FR-20. Quản lý nội dung marketing

Admin phải có khả năng:

- Quản lý banner.
- Quản lý blog.
- Quản lý popup.
- Seed hoặc cập nhật site settings.

#### FR-21. Quản lý cấu hình AI

Admin phải có khả năng:

- Xem danh sách system prompts.
- Xem system prompt theo key.
- Cập nhật prompt đang hoạt động.
- Cấu hình appearance của chat widget.

#### FR-22. Quản lý phiên chat và chăm sóc khách hàng

Admin phải có khả năng:

- Xem danh sách session chat.
- Đồng bộ session từ log.
- Tự động archive session cũ.
- Xem tin nhắn của session.
- Tìm kiếm tin nhắn trong session.
- Đánh dấu đã đọc.
- Tạm dừng AI.
- Tham gia hoặc rời phiên chat.
- Gắn thông tin khách hàng cho phiên chat.
- Gửi tin nhắn admin trực tiếp vào session.
- Đóng, mở lại hoặc xóa session.

#### FR-23. Quản lý abandoned carts và thông báo

Admin phải có khả năng:

- Xem giỏ hàng bị bỏ quên.
- Ghi chú cho abandoned cart.
- Xem thông báo quản trị.
- Xem số lượng thông báo chưa đọc.
- Đánh dấu đã đọc một hoặc tất cả thông báo.

---

## 4. Yêu cầu giao diện ngoài

### 4.1 Giao diện người dùng

Hệ thống phải cung cấp:

- Website responsive cho desktop và mobile.
- Giao diện khách hàng gồm trang chủ, shop, chi tiết sản phẩm, giỏ hàng, checkout, blog, tài khoản.
- Giao diện quản trị tách riêng với dashboard và các module quản trị.
- Widget AI chat/voice nổi trên giao diện khách hàng.
- Hỗ trợ đa ngôn ngữ Việt/Anh.

### 4.2 Giao diện phần mềm

Hệ thống giao tiếp với:

- PostgreSQL để lưu dữ liệu nghiệp vụ.
- Dịch vụ email để gửi OTP và thông báo.
- Google/Facebook OAuth để xác thực xã hội.
- VNPay, MoMo, PayPal để thanh toán.
- AI provider để xử lý hội thoại chat và voice.

### 4.3 Giao diện API

Hệ thống backend phải cung cấp các nhóm API:

- `/api/v1/auth`
- `/api/v1/products`
- `/api/v1/orders`
- `/api/v1/users`
- `/api/v1/addresses`
- `/api/v1/wishlist`
- `/api/v1/reviews`
- `/api/v1/payment`
- `/api/v1/chat`
- `/api/v1/admin`
- `/api/v1/contact`
- `/api/v1/newsletter`
- `/api/v1/location`
- `/api/v1/shipping`

### 4.4 Giao diện phần cứng

- Người dùng cuối cần thiết bị có trình duyệt hiện đại.
- Với voice chat, thiết bị cần microphone hoạt động bình thường.

---

## 5. Yêu cầu dữ liệu

### 5.1 Thực thể dữ liệu chính

Các thực thể chính của hệ thống gồm:

- `User`
- `Product`
- `Variant`
- `Order`
- `OrderItem`
- `Address`
- `Wishlist`
- `Review`
- `Coupon`
- `CouponUsage`
- `Banner`
- `Blog`
- `Popup`
- `Newsletter`
- `Notification`
- `SystemPrompt`
- `SiteSettings`
- `ChatSession`
- `ChatLog`
- `AbandonedCart`

### 5.2 Quan hệ dữ liệu ở mức khái quát

- Một `User` có thể có nhiều `Address`, `Order`, `Wishlist`, `Review`.
- Một `Product` có nhiều `Variant` và nhiều `Review`.
- Một `Order` có nhiều `OrderItem`.
- Một `Coupon` có thể được dùng trong nhiều đơn hàng hoặc nhiều lượt áp dụng.
- Một `ChatSession` có nhiều `ChatLog`.

### 5.3 Yêu cầu toàn vẹn dữ liệu

- Email người dùng phải là duy nhất.
- Dữ liệu đơn hàng phải lưu được trạng thái thanh toán và trạng thái vận hành.
- Dữ liệu biến thể phải phản ánh được tồn kho và trạng thái khả dụng.
- Dữ liệu review phải gắn với sản phẩm và người dùng hợp lệ.
- Dữ liệu chat phải tách theo session để truy xuất lịch sử.

---

## 6. Yêu cầu phi chức năng

### 6.1 Bảo mật

Hệ thống phải:

- Sử dụng JWT cho xác thực.
- Phân quyền rõ giữa customer và admin.
- Giới hạn tốc độ truy cập cho API chung, auth và chat.
- Dùng `Helmet` để tăng cường security headers.
- Kiểm soát CORS theo domain cho phép.
- Không cho phép truy cập API quản trị khi chưa xác thực đúng vai trò.

### 6.2 Hiệu năng

Hệ thống nên:

- Phản hồi phần lớn request thông thường trong thời gian ngắn dưới điều kiện tải trung bình.
- Tách frontend và backend rõ ràng để dễ mở rộng.
- Dùng SSR để cải thiện trải nghiệm tải trang và SEO.
- Hạn chế lạm dụng chat/voice bằng rate limit riêng.

### 6.3 Độ tin cậy và sẵn sàng

Hệ thống phải:

- Có endpoint health check.
- Ghi log request và lỗi hệ thống.
- Xử lý lỗi tập trung qua middleware.
- Hoạt động ổn định ngay cả khi service ngoài tạm thời lỗi, với phản hồi lỗi rõ ràng cho người dùng.

### 6.4 Khả năng bảo trì

Hệ thống phải:

- Chia tách mã nguồn theo `routes`, `controllers`, `services`, `models`.
- Có tài liệu cấu trúc và hướng dẫn cài đặt cơ bản.
- Cho phép bổ sung cổng thanh toán hoặc module quản trị mới mà không phải viết lại toàn hệ thống.

### 6.5 Khả năng sử dụng

Hệ thống nên:

- Có giao diện dễ dùng cho cả khách hàng và admin.
- Hỗ trợ flow mua hàng rõ ràng từ khám phá đến thanh toán.
- Cho phép tương tác AI không làm gián đoạn trải nghiệm xem sản phẩm.

### 6.6 Tương thích và triển khai

Hệ thống phải:

- Chạy được trong môi trường phát triển local.
- Có thể containerize bằng Docker ở các thành phần chính.
- Hỗ trợ triển khai frontend và backend độc lập.

### 6.7 Quốc tế hóa

Hệ thống phải:

- Hỗ trợ song ngữ Việt/Anh.
- Hỗ trợ hiển thị tiền tệ theo cấu hình frontend hiện có.

---

## 7. Tóm tắt use case

| Mã | Use case | Actor chính |
|---|---|---|
| UC-01 | Đăng ký và xác thực OTP | Guest |
| UC-02 | Đăng nhập hệ thống | Guest |
| UC-03 | Duyệt, lọc và xem chi tiết sản phẩm | Guest, Customer |
| UC-04 | Thêm sản phẩm vào wishlist | Customer |
| UC-05 | Thêm sản phẩm vào giỏ và checkout | Customer |
| UC-06 | Thanh toán qua cổng trực tuyến | Customer |
| UC-07 | Xem lịch sử và chi tiết đơn hàng | Customer |
| UC-08 | Viết review cho sản phẩm đã mua | Customer |
| UC-09 | Tư vấn bằng AI chat | Guest, Customer |
| UC-10 | Tư vấn bằng AI voice | Guest, Customer |
| UC-11 | Quản lý sản phẩm và biến thể | Admin |
| UC-12 | Quản lý đơn hàng | Admin |
| UC-13 | Quản lý người dùng và review | Admin |
| UC-14 | Quản lý coupon, banner, blog, popup | Admin |
| UC-15 | Quản lý system prompt và phiên chat | Admin |

---

## 8. Tiêu chí nghiệm thu ở mức hệ thống

Hệ thống được xem là đạt yêu cầu khi:

- Người dùng có thể đăng ký, xác thực và đăng nhập thành công.
- Người dùng có thể duyệt sản phẩm, xem chi tiết, thêm wishlist và tạo đơn hàng.
- Tối thiểu một cổng thanh toán hoạt động end-to-end trong môi trường kiểm thử.
- Admin có thể CRUD sản phẩm, cập nhật trạng thái đơn và quản lý người dùng.
- AI chat hoạt động với greeting, trả lời và lưu lịch sử session.
- Voice chat có thể khởi tạo phiên, nhận phản hồi và đồng bộ transcript.
- Hệ thống không cho guest truy cập các API yêu cầu xác thực.
- Admin-only routes được bảo vệ bằng xác thực và phân quyền.
- Dữ liệu cốt lõi được lưu trong PostgreSQL và có thể truy xuất lại đúng theo nghiệp vụ.

---

## 9. Ngoài phạm vi tài liệu

Các nội dung sau chưa được đặc tả sâu trong tài liệu này:

- Thiết kế UI chi tiết ở mức wireframe từng màn hình.
- Thuật toán recommendation AI ở mức mô hình.
- Chính sách backup/restore hạ tầng production chi tiết.
- Kiểm thử hiệu năng quy mô lớn và benchmark chính thức.
- Luồng mobile app native vì hệ thống hiện là web application.

---

## 10. Ghi chú đồng bộ với repo hiện tại

- Tài liệu này được viết theo mã nguồn hiện có trong repo tại thời điểm `2026-04-10`.
- README cũ có nhắc đến `ai_service` dạng FastAPI, nhưng trong repo hiện tại không còn thư mục đó.
- Vì vậy, SRS này mô tả đúng trạng thái triển khai hiện tại: AI được tích hợp thông qua backend Express và các service nội bộ.
