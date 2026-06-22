# Hệ thống Quản lý Sự kiện & Hỗ trợ AI (University Event Management System)

Dự án phần mềm quản lý và điều phối hoạt động sự kiện tích hợp Trí tuệ nhân tạo, giúp số hóa toàn bộ quy trình từ khâu lập kế hoạch đến vận hành thực tế trong môi trường đại học.

 1. Thành viên nhóm

| STT | Họ và Tên | Vai trò chính trong dự án | Phân công công việc |
|---|---|---|---|
| 1 | **Trần Xuân Thuận** | Project Lead | Thiết kế kiến trúc hệ thống, phát triển Core API, tích hợp dịch vụ AI (RAG, Recommendation). |
| 2 | **Nguyễn Nhật Linh** | Frontend Developer | Phát triển giao diện Web/Mobile, tối ưu hóa UI/UX, tích hợp QR Scanner. |
| 3 | **Khưu Xuân Nhân** | Business Analyst / QA | Đặc tả yêu cầu hệ thống (SRS), phân tích Use Case, viết kịch bản kiểm thử (Test cases). |
| 4 | **Dương Phú Hoàng Tuấn** | BackEnd Developer | Thiết lập cơ sở dữ liệu, quản lý phân quyền hệ thống. |
| 5 | **Nguyễn Khoa Hiệp** | BackEnd Developer | Thiết lập cơ sở dữ liệu, quản lý phân quyền hệ thống. |

---

 2. Tổng quan Dự án

 2.1. Phân hệ Nghiệp vụ cốt lõi (Business Scope)
* **Quy trình phê duyệt khép kín:** Số hóa luồng xét duyệt sự kiện và đặt địa điểm (Venue Booking) đa tầng giữa Ban chủ nhiệm CLB, Cán bộ IC-PDP, Đối tác doanh nghiệp và Phòng Công tác Sinh viên (CTSV).
* **Vận hành & Điểm danh thời gian thực:** Đăng ký tham gia, bán vé trực tuyến tích hợp cổng thanh toán, cấp phát vé định danh qua mã QR và kiểm soát Check-in tại địa điểm nhằm chống gian lận.
* **Quản trị & Đánh giá đa chiều:** Thu thập phản hồi từ người tham gia, lưu trữ Master Data (dữ liệu lõi về cơ sở vật chất, danh mục), thống kê hiệu suất hoạt động của các câu lạc bộ thông qua Dashboard trực quan.

 2.2. Hàm lượng Nghiên cứu Khoa học & Công nghệ (Research Depth)
* **Hệ thống Gợi ý thông minh (Smart Recommendation):** Ứng dụng thuật toán Lọc cộng tác (Collaborative Filtering) dựa trên Độ tương đồng Cosine ($Cosine\ Similarity$) để gợi ý sự kiện cá nhân hóa theo sở thích và lịch sử tham gia của từng sinh viên.
* **Kiến trúc Trợ lý ảo (RAG Framework):** Tích hợp AI Assistant sử dụng mô hình Retrieval-Augmented Generation kết nối API LLM để truy xuất dữ liệu từ cẩm nang, quy chế nội bộ, giảm thiểu tình trạng AI sinh thông tin ảo (Hallucination).
* **Kiểm soát Truy cập Đa vai trò (Multi-role RBAC):** Thiết kế giải pháp phân quyền cho phép một tài khoản gán đồng thời nhiều vai trò (ví dụ: vừa là Sinh viên, vừa là ClubOrganizer) và chuyển đổi không gian làm việc (Context Switch) linh hoạt mà không cần đăng nhập lại.
* **Xử lý Xung đột Lịch trình:** Thuật toán phát hiện giao thoa thời gian (Schedule Conflict Detection) tự động quét và đưa ra cảnh báo hoặc chặn nếu sự kiện đăng ký trùng với khung giờ của sự kiện khác đã tham gia.

---

 3. Các Tính năng Chính theo Nhóm Người dùng (Key Features)

 3.1. Guest (Khách ngoài)
* **Đăng ký / Đăng nhập:** Tạo và quản lý tài khoản cá nhân thông qua số điện thoại hoặc email.
* **Trang chủ hệ thống:** Theo dõi các sự kiện nổi bật, tin tức tiêu điểm và thông báo chính thức từ nhà trường.
* **Xem & Tìm kiếm sự kiện:** Duyệt danh sách event công khai; tìm kiếm và lọc nâng cao theo tên, câu lạc bộ hoặc loại hình (*Academic, Entertainment, Workshop, Competition*).
* **Tra cứu thông tin CLB:** Duyệt danh sách các CLB đang hoạt động, đọc giới thiệu và tìm kiếm theo tên.
* **Đăng ký & Mua vé:** Đăng ký tham gia các sự kiện mở; thực hiện thanh toán online (Purchase Ticket) cho các sự kiện/đêm nhạc lớn qua cổng thanh toán tích hợp.
* **Check-in Event:** Xuất trình mã QR cá nhân cho Ban tổ chức hoặc chủ động tự quét mã tại địa điểm để xác nhận tham gia.
* **Đánh giá sự kiện (Review):** Gửi phản hồi, chấm điểm và viết nhận xét sau khi sự kiện kết thúc.

 3.2. Student (Sinh viên trường)
* **Đăng nhập SSO:** Truy cập hệ thống nhanh chóng bằng tài khoản email trường định danh (Single Sign-On).
* **Hồ sơ cá nhân:** Thiết lập và cập nhật thông tin liên hệ, ảnh đại diện (avatar) và các danh mục sở thích để tối ưu hóa bộ lọc gợi ý.
* **Tìm kiếm & Lọc sự kiện nâng cao:** Duyệt danh sách event linh hoạt; lọc theo tên, ngày diễn ra, câu lạc bộ, loại hình và trạng thái vé (*còn slot / hết slot*).
* **Quản lý tham gia:** Thực hiện đăng ký, hủy đăng ký trực tuyến; quản lý danh sách và trạng thái các sự kiện đã hoặc sắp tham gia.
* **Tự động quản lý lịch trình:** Hiển thị thời gian biểu các event sắp tới; hệ thống tự động đưa ra cảnh báo hoặc chặn đăng ký nếu phát hiện trùng khung giờ.
* **Xác thực tham gia (Scan QR):** Sử dụng thiết bị cá nhân để quét mã QR điểm danh trực tiếp tại địa điểm sự kiện.
* **Phản hồi & Cập nhật:** Gửi đánh giá sau sự kiện; theo dõi hệ thống thông báo đẩy (Notification) về cập nhật từ sự kiện và các văn bản từ nhà trường.

 3.3. ClubOrganizer (Ban chủ nhiệm CLB)
* **Quản lý hồ sơ CLB:** Cập nhật bộ nhận diện thương hiệu gồm logo, ảnh đại diện và thông tin giới thiệu chung của câu lạc bộ.
* **Khởi tạo đề xuất sự kiện:** Lên kế hoạch (proposal), tải lên banner truyền thông, thiết lập cấu hình vé (số lượng, loại vé), lựa chọn địa điểm/phòng ban mong muốn.
* **Gửi duyệt (Submit to ICPDP):** Chuyển hồ sơ đề xuất sự kiện lên phân hệ quản lý của cán bộ IC-PDP để chờ xét duyệt.
* **Quản lý người tham gia:** Theo dõi danh sách sinh viên/khách ngoài đăng ký; có quyền phê duyệt hoặc từ chối danh sách tham gia dựa trên các tiêu chí cụ thể.
* **Điểm danh tự động:** Khởi tạo mã QR điểm danh (Create QR to attendance) tại sự kiện cho người tham gia quét.
* **Báo cáo & Thống kê:** Gửi báo cáo tổng kết kết quả (Post-event Report) cho IC-PDP sau khi sự kiện kết thúc; theo dõi Dashboard số liệu trực quan về tỷ lệ đăng ký và tỷ lệ check-in thực tế.

 3.4. Partner (Đối tác doanh nghiệp)
* **Quản lý tài khoản:** Đăng nhập và sử dụng hệ thống bằng tài khoản định danh do Phòng CTSV cấp riêng.
* **Đề xuất chương trình hợp tác:** Gửi yêu cầu, kế hoạch tổ chức các chương trình Workshop, Talkshow hoặc Cuộc thi học thuật phối hợp tại trường.
* **Ký kết & Tất toán:** Xác nhận hợp đồng hợp tác số hóa và theo dõi tiến độ thanh toán chi phí tổ chức/tài trợ với phòng CTSV.
* **Dashboard đối tác:** Giám sát trực tiếp số lượng và thông tin tổng quan của sinh viên đăng ký tham gia chuỗi sự kiện của doanh nghiệp.

 3.5. ICPDP (Cán bộ ban IC-PDP)
* **Xét duyệt đề xuất CLB:** Tiếp nhận, thẩm định chi tiết nội dung, thời gian và kế hoạch (proposal) gửi lên từ các ClubOrganizer.
* **Ra quyết định phê duyệt:** Phê duyệt (Approved) hoặc Từ chối đề xuất kèm lý do; sự kiện được duyệt sẽ chuyển sang trạng thái Approved (Lưu trữ nội bộ trước khi hiển thị).
* **Giám sát hoạt động:** Xem và quản lý danh sách toàn bộ các câu lạc bộ đang hoạt động thuộc quyền quản lý của ban.
* **Nghiệm thu báo cáo:** Tiếp nhận, đánh giá và lưu trữ các báo cáo sau sự kiện (Post-event Report) từ các CLB để tính điểm hiệu suất hoạt động.

 3.6. CTSV (Cán bộ Phòng Công tác Sinh viên)
* **Xét duyệt đề xuất đối tác:** Thẩm định và đánh giá các yêu cầu tổ chức Workshop/Cuộc thi từ các Đối tác doanh nghiệp (Partner).
* **Quản lý hợp đồng:** Theo dõi, kiểm soát tiến trình ký kết văn bản ghi nhớ (MOU), hợp đồng tài trợ và luồng tài chính với Partner.
* **Công bố sự kiện (Publish):** Đưa ra quyết định cuối cùng để hiển thị (Publish) các sự kiện đã qua kiểm duyệt lên trang chủ hệ thống cho toàn bộ sinh viên thấy.
* **Tạo sự kiện cấp trường:** Trực tiếp khởi tạo và quản lý các sự kiện quy mô lớn của nhà trường (Lễ tốt nghiệp, Lễ tôn vinh sinh viên, Khai giảng...).
* **Hệ thống thông báo:** Soạn thảo và gửi các thông báo chính thức, cảnh báo khẩn cấp phạm vi toàn trường trên nền tảng.

 3.7. Admin (Quản trị viên hệ thống IT)
* **Kiểm soát tài khoản & Phân quyền:** Khóa, mở khóa và cấp quyền truy cập chính xác cho các nhóm người dùng nội bộ và đối tác ngoại bang (*CTSV, ICPDP, Partner, ClubOrganizer*).
* **Cấu hình hệ thống:** Tích hợp và kiểm thử cổng thanh toán trực tuyến, vận hành hệ thống Email Server và thiết lập điều phối luồng thông báo tự động (Push Notification) toàn nền tảng.
* **Quản trị dữ liệu lõi (Master Data CRUD):** Thực hiện các thao tác Thêm, Đọc, Sửa, Xóa đối với các danh mục phân loại sự kiện (Category), danh sách cơ sở vật chất (Phòng học/Hội trường) và danh sách gốc của các Câu lạc bộ.
* **Giám sát & Phân tích:** Theo dõi lưu lượng truy cập hệ thống thời gian thực, đo lường tổng doanh thu vé và kiểm tra các chỉ số sức khỏe của máy chủ để đảm bảo nền tảng vận hành ổn định, không nghẽn mạng.

 3.8. Phân hệ Tính năng Trí tuệ nhân tạo (AI Features)

| Tính năng AI | Mô tả chi tiết | Đối tượng thụ hưởng |
| :--- | :--- | :--- |
| **Smart Recommend** | Tự động phân tích sở thích và lịch sử tham gia để gợi ý danh sách sự kiện phù hợp nhất ngay tại màn hình trang chủ. | **Student** |
| **AI Chatbot** | Tích hợp API LLM (kết hợp RAG) hỗ trợ giải đáp tự động (FAQ), trả lời thông tin chi tiết về sự kiện và hướng dẫn quy trình check-in. | **Tất cả người dùng** |
| **AI Content Generator** | Tự động tạo/gợi ý viết phần mô tả sự kiện, lên ý tưởng nội dung tiêu đề và viết sẵn các bài đăng (caption) truyền thông mạng xã hội khi tạo event mới. | **ClubOrganizer** |

---

 4. Quản lý Tiến độ Công việc (Jira)

Toàn bộ các đầu việc và tiến độ của dự án được quản lý nghiêm ngặt theo mô hình Agile/Scrum, phân chia cụ thể theo từng tuần làm việc (Sprint).
* **Workflow chuẩn hóa:** `To Do` $\rightarrow$ `In Progress` $\rightarrow$ `Review` $\rightarrow$ `Done`. Mỗi task đều được gán định danh (assignee), mô tả chi tiết yêu cầu kỹ thuật và thời hạn hoàn thành cụ thể cho từng thành viên.

---

## 5. Thiết kế Giao diện & Kiến trúc Front-end

* **Không gian thiết kế UI/UX (Figma):** [Bản vẽ Prototype UI/UX - Figma](https://www.figma.com/design/6YyEWmr3mE0FdUOPP6PDZ7/SWP391_2?node-id=0-1&p=f&t=IacmLmGgTCZIo79C-0)
* **Cấu trúc thư mục mã nguồn Front-end:**
  ```text
  frontend/
  ├── public/              # Tài nguyên tĩnh (Images, Logo, Icons, Favicon)
  ├── src/
  │   ├── components/      # Các UI component độc lập dùng chung (Button, Modal, Table, Input...)
  │   ├── views/           # Các màn hình chức năng chính, phân vùng quản lý chi tiết theo Role
  │   │   ├── Guest/
  │   │   ├── Student/
  │   │   ├── ClubOrganizer/
  │   │   ├── Partner/
  │   │   ├── Admin/
  │   │   └── University/  # Giao diện dành chung cho ICPDP và CTSV
  │   ├── services/        # Cấu hình Axios, Services gọi API Endpoint và tích hợp cổng dịch vụ AI
  │   ├── store/           # Quản lý trạng thái ứng dụng toàn cục (Redux Toolkit / Zustand)
  │   └── utils/           # Thư viện bổ trợ (Định dạng ngày tháng, Helper Functions, Validate Form)
  └── package.json         # Danh sách các gói thư viện phụ thuộc và Scripts khởi chạy ứng dụng
---

## 6. Software Requirements Specification (SRS)

Tài liệu đặc tả yêu cầu phần mềm (Software Requirements Specification - SRS) mô tả chi tiết các yêu cầu chức năng, phi chức năng, kiến trúc hệ thống, Use Case, sơ đồ nghiệp vụ và các quy trình vận hành của hệ thống.

* **Tài liệu SRS chính thức:**  
  https://docs.google.com/document/d/1Ohi8aSZe6-BUiZyDP1EOFx879613F8aDj0wKdy9QHaw/edit?usp=sharing

### 6.1. Nội dung chính trong tài liệu SRS
* Giới thiệu tổng quan hệ thống.
* Phân tích yêu cầu nghiệp vụ.
* Danh sách Actor và Use Case.
* Đặc tả chức năng theo từng phân hệ.
* Yêu cầu phi chức năng:
  * Performance
  * Security
  * Scalability
  * Availability
  * Maintainability
* Thiết kế cơ sở dữ liệu (ERD).
* Kiến trúc hệ thống.
* Quy trình phân quyền RBAC đa vai trò.
* Mô hình AI Recommendation & RAG Chatbot.
* Quy trình kiểm thử và đánh giá chất lượng hệ thống.

### 6.2. Công nghệ và chuẩn áp dụng trong SRS
| Hạng mục | Công nghệ / Phương pháp |
|---|---|
| Development Process | Agile / Scrum |
| Requirement Modeling | UML, Use Case Diagram, Activity Diagram |
| API Architecture | RESTful API |
| Authentication | JWT + SSO |
| Database Design | SQL Server |
| AI Recommendation | Collaborative Filtering |
| AI Assistant | RAG + LLM API |
| Frontend Architecture | Component-based Architecture |
| Backend Architecture | Layered Architecture |

### 6.3. Mục tiêu tài liệu
Tài liệu SRS đóng vai trò là nền tảng chuẩn hóa toàn bộ quá trình phát triển hệ thống, giúp:
* Đồng bộ yêu cầu giữa khách hàng và đội phát triển.
* Hỗ trợ phân chia Sprint và quản lý tiến độ trên Jira.
* Làm cơ sở cho thiết kế UI/UX, Database và API.
* Hỗ trợ kiểm thử phần mềm (Testing & QA).
* Giảm thiểu rủi ro thay đổi yêu cầu trong quá trình phát triển.

---

## 7. Các Cập nhật & Tối ưu hóa Mới nhất (Recent Updates)

Hệ thống đã được bổ sung, hoàn thiện và tối ưu hóa sâu các phân hệ nghiệp vụ sau:

### 7.1. Phân hệ Phòng Công tác Sinh viên (CTSV) & ICPDP
* **Tối ưu hóa Giao diện Mobile:** Cải tiến hệ thống Navigation, Header, Sidebar và Menu Hamburger để mang lại trải nghiệm tối ưu cho người dùng thiết bị di động.
* **Tích hợp Xuất Excel:** Hỗ trợ xuất trực quan dữ liệu báo cáo sự kiện/sinh viên ra định dạng Excel từ Dashboard.
* **Quy trình Nộp Báo cáo (Report Submission):** Thiết lập quy trình nộp và xử lý báo cáo tổng kết sự kiện tối giản, minh bạch.
* **Tối ưu hóa Dashboard & Lọc Thông báo:** Thiết lập điều chỉnh lời chào dựa theo múi giờ Việt Nam, tối ưu bộ lọc thông báo trên dashboard.
* **Quản trị Thông báo Toàn diện (Announcement Management):** Xây dựng hoàn thiện phân hệ quản trị tin tức/thông báo đa nền tảng (CRUD). Cho phép CTSV và Admin soạn thảo, đính kèm hình ảnh đại diện, liên kết với các sự kiện chính quy/đối tác đã duyệt, cấu hình nhóm đối tượng nhận tin (*Guest, Student, Club Organizer, Partner, ICPDP, CTSV, Admin*) và loại thông báo (*Thông tin thường, Yêu cầu hành động, Khẩn cấp*).

### 7.2. Phân hệ Đối tác (Partner)
* **Nâng cấp Portal & Mobile Hero:** Tối ưu hóa giao diện hiển thị biểu ngữ (Hero section/Banner) trên di động của Partner, cải tiến thanh điều hướng Sidebar giúp tương thích tốt hơn.

### 7.3. Cải tiến Kỹ thuật & Hiệu năng (Technical Enhancements)
* **Cơ chế API Caching & Request Deduping:** Triển khai module `apiCache.js` ở Frontend để lưu trữ tạm thời phản hồi API (TTL mặc định 60 giây). Tích hợp cơ chế **Deduping** (`cachedFetchDedup`) nhằm ngăn chặn việc gọi trùng lặp các API Request bất đồng bộ đang thực thi cùng lúc.
* **Tối ưu hóa `useUserProfile` Hook:** Áp dụng bộ đệm API Cache & Deduping để tối ưu hóa việc tải dữ liệu hồ sơ cá nhân. Tránh tình trạng lặp lại yêu cầu API lấy thông tin người dùng khi chuyển hướng trang hoặc render nhiều thành phần giao diện song song, giảm tải rõ rệt cho Server Backend.
* **Bảo mật Đăng xuất (Secure Logout):** Tự động dọn sạch toàn bộ cache dữ liệu API (`clearAllCache`) ngay khi người dùng đăng xuất, ngăn ngừa nguy cơ rò rỉ dữ liệu hoặc dùng lại thông tin của phiên làm việc cũ.


<!-- doc-anchor: project-title -->

<!-- doc-anchor: team-members -->

<!-- doc-anchor: business-approval-workflow -->

<!-- doc-anchor: business-operations-checkin -->

<!-- doc-anchor: business-dashboard-evaluation -->

<!-- doc-anchor: research-collaborative-filtering -->

<!-- doc-anchor: research-rag-framework -->

<!-- doc-anchor: research-multi-role-rbac -->

<!-- doc-anchor: research-schedule-conflict -->

<!-- doc-anchor: guest-auth -->

<!-- doc-anchor: guest-home -->

<!-- doc-anchor: guest-search-events -->

<!-- doc-anchor: guest-clubs -->

<!-- doc-anchor: guest-ticket-purchase -->

<!-- doc-anchor: guest-checkin -->

<!-- doc-anchor: guest-review -->

<!-- doc-anchor: student-sso -->

<!-- doc-anchor: student-profile -->

<!-- doc-anchor: student-advanced-filter -->

<!-- doc-anchor: student-participation-mgmt -->

<!-- doc-anchor: student-schedule-conflict -->

<!-- doc-anchor: student-qr-checkin -->

<!-- doc-anchor: student-feedback-notifications -->

<!-- doc-anchor: club-profile-mgmt -->

<!-- doc-anchor: club-event-proposal -->

<!-- doc-anchor: club-submit-icpdp -->

<!-- doc-anchor: club-participant-mgmt -->

<!-- doc-anchor: club-qr-attendance -->

<!-- doc-anchor: club-report-dashboard -->

<!-- doc-anchor: partner-account -->

<!-- doc-anchor: partner-cooperation-proposal -->

<!-- doc-anchor: partner-contract-payment -->

<!-- doc-anchor: partner-dashboard -->

<!-- doc-anchor: icpdp-proposal-review -->

<!-- doc-anchor: icpdp-approval-decision -->

<!-- doc-anchor: icpdp-club-supervision -->

<!-- doc-anchor: icpdp-post-event-report -->

<!-- doc-anchor: ctsv-partner-approval -->

<!-- doc-anchor: ctsv-contract-mgmt -->

<!-- doc-anchor: ctsv-event-publish -->

<!-- doc-anchor: ctsv-school-events -->

<!-- doc-anchor: ctsv-campus-notifications -->
