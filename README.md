# FEvents — Hệ thống Quản lý Sự kiện & Hỗ trợ AI

> University Event Management System — nền tảng số hóa toàn bộ quy trình tổ chức sự kiện trong môi trường đại học (FPT Students Community), từ lập kế hoạch, phê duyệt đa tầng, bán vé & điểm danh QR, đến báo cáo và gợi ý thông minh bằng AI.

- **Website:** https://fevent.qzz.io
- **Figma (UI/UX):** [Prototype trên Figma](https://www.figma.com/design/6YyEWmr3mE0FdUOPP6PDZ7/SWP391_2?node-id=0-1)
- **SRS:** [Tài liệu đặc tả yêu cầu](https://docs.google.com/document/d/1Ohi8aSZe6-BUiZyDP1EOFx879613F8aDj0wKdy9QHaw/edit?usp=sharing)

---

## 1. Thành viên nhóm

| STT | Họ và Tên | Vai trò | Phân công |
|---|---|---|---|
| 1 | **Trần Xuân Thuận** | Project Lead | Kiến trúc hệ thống, Core API, tích hợp AI (RAG, Recommendation) |
| 2 | **Nguyễn Nhật Linh** | Frontend Developer | Giao diện Web/Mobile, UI/UX, tích hợp QR Scanner |
| 3 | **Khưu Xuân Nhân** | Business Analyst / QA | Đặc tả SRS, phân tích Use Case, viết Test cases |
| 4 | **Dương Phú Hoàng Tuấn** | Backend Developer | Cơ sở dữ liệu, phân quyền hệ thống |
| 5 | **Nguyễn Khoa Hiệp** | Backend Developer | Cơ sở dữ liệu, phân quyền hệ thống |

---

## 2. Công nghệ sử dụng

| Lớp | Công nghệ |
|---|---|
| **Frontend** | React 19, Vite, React Router 7, Tailwind CSS 4 |
| **Backend** | Node.js, Express 4, Mongoose 9 |
| **Database** | MongoDB (Atlas) |
| **Xác thực** | JWT + Google OAuth 2.0 (SSO), RBAC đa vai trò |
| **Lưu trữ media** | Cloudinary |
| **Email** | Nodemailer / Brevo API |
| **AI** | LLM API (Gemini / Groq) cho Chatbot RAG; Collaborative Filtering (Cosine Similarity) cho Recommendation |
| **QR** | html5-qrcode, qrcode |
| **Triển khai** | Backend → Render · Frontend → Vercel · DB → MongoDB Atlas · Media → Cloudinary |

Kiến trúc: **RESTful API** (backend phân lớp routes → controllers → services → models), **frontend component-based** (SPA).

---

## 3. Cấu trúc dự án

```text
SWP391-1/
├── BE/                         # Backend (Express + Mongoose)
│   ├── server.js               # Điểm khởi chạy, bind 0.0.0.0:5000
│   ├── src/
│   │   ├── app.js              # Khởi tạo Express, CORS, middleware
│   │   ├── config/             # env, kết nối DB, Cloudinary
│   │   ├── routes/             # Định nghĩa REST endpoints
│   │   ├── controllers/        # Xử lý request/response
│   │   ├── services/           # Nghiệp vụ, tương tác model
│   │   ├── models/             # Mongoose schema
│   │   ├── middleware/         # Auth, RBAC, dbReady, error handler
│   │   └── scripts/            # Seed dữ liệu, migrate media, db-health
│   └── uploads/                # Fallback lưu file local (dev; production dùng Cloudinary)
│
├── FE/                         # Frontend (React + Vite)
│   ├── public/                 # Tài nguyên tĩnh, robots.txt, sitemap.xml
│   ├── src/
│   │   ├── pages/              # Màn hình theo vai trò (admin/, ctsv/, icpdp/, partner/…)
│   │   ├── components/         # UI component dùng chung
│   │   ├── layouts/            # Layout theo portal
│   │   ├── services/           # Gọi API, cache & dedupe
│   │   ├── hooks/              # Custom hooks
│   │   ├── utils/              # Helper (format, auth, google, …)
│   │   ├── data/              # Cấu hình tĩnh (nav, footer)
│   │   └── i18n/               # Đa ngôn ngữ (vi/en)
│   └── vercel.json             # Cấu hình SPA rewrite + headers
│
├── render.yaml                 # Blueprint deploy backend lên Render
├── docker-compose.yml          # Chạy toàn bộ stack bằng Docker (tùy chọn)
└── .github/workflows/          # GitHub Actions (keep-alive ping Render/Vercel)
```

---

## 4. Cài đặt & Chạy (local)

### Yêu cầu
- Node.js 18+ và npm
- Một MongoDB (Atlas hoặc local)
- (Tùy chọn) Tài khoản Cloudinary, Google OAuth, Brevo/Gmail để bật đầy đủ tính năng

### 4.1. Backend

```bash
cd BE
npm install
cp .env.example .env        # rồi điền các biến (MONGO_URI, JWT_SECRET, …)
node server.js              # chạy tại http://localhost:5000
```

Các biến môi trường quan trọng (xem đầy đủ trong `BE/.env.example`):

| Biến | Ý nghĩa |
|---|---|
| `MONGO_URI` | Chuỗi kết nối MongoDB |
| `JWT_SECRET` | Khóa ký JWT |
| `CLIENT_ORIGIN` / `APP_URL` | Origin của frontend (CORS + redirect) |
| `CLOUDINARY_*` | Lưu ảnh/file bền (bắt buộc khi deploy) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | Đăng nhập Google |
| `BREVO_API_KEY` / `EMAIL_FROM` | Gửi email OTP/thông báo |
| `GEMINI_API_KEY` / `GROQ_API_KEY` | AI chatbot & trích xuất file |

Tạo tài khoản admin: `node seed-admin.js <email> <password> <fullname>`
Seed dữ liệu mẫu: `npm run seed`

### 4.2. Frontend

```bash
cd FE
npm install
npm run dev                 # chạy tại http://localhost:5173
```

Chạy cho LAN (test trên điện thoại cùng mạng): `npm run dev:lan`
Build production: `npm run build` → xuất ra `FE/dist`

Biến môi trường frontend (đặt trong `FE/.env` hoặc trên Vercel):

| Biến | Ý nghĩa |
|---|---|
| `VITE_API_BASE` | URL backend production (vd `https://swp391-d982.onrender.com`) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client id |

### 4.3. Docker (tùy chọn)

```bash
cp .env.docker.example .env
docker compose up --build
```

---

## 5. Tính năng chính theo vai trò

Hệ thống dùng **RBAC đa vai trò**: một tài khoản có thể mang nhiều vai trò và chuyển đổi không gian làm việc mà không cần đăng nhập lại.

- **Guest** — đăng ký/đăng nhập, xem & tìm kiếm sự kiện/CLB công khai, đăng ký & mua vé, check-in QR, đánh giá sự kiện.
- **Student** — đăng nhập SSO, hồ sơ & sở thích, lọc sự kiện nâng cao, quản lý đăng ký, phát hiện trùng lịch, quét QR điểm danh, nhận thông báo.
- **ClubOrganizer (CLB)** — quản lý hồ sơ CLB, tạo đề xuất sự kiện, cấu hình vé, gửi duyệt ICPDP, quản lý người tham gia, tạo QR điểm danh, báo cáo tổng kết.
- **Partner (đối tác)** — đề xuất chương trình hợp tác, ký kết & tất toán, dashboard theo dõi đăng ký.
- **ICPDP** — xét duyệt đề xuất CLB, ra quyết định phê duyệt/từ chối, giám sát CLB, nghiệm thu báo cáo.
- **CTSV** — xét duyệt đối tác, quản lý hợp đồng/tài chính, công bố (publish) sự kiện, tạo sự kiện cấp trường, gửi thông báo toàn trường.
- **Admin** — quản lý tài khoản & phân quyền, cấu hình hệ thống (thanh toán, email, notification), quản trị Master Data, giám sát & thống kê.

### Phân hệ AI

| Tính năng | Mô tả | Đối tượng |
|---|---|---|
| **Smart Recommend** | Gợi ý sự kiện cá nhân hóa theo sở thích & lịch sử (Collaborative Filtering) | Student |
| **AI Chatbot** | Trợ lý ảo RAG + LLM giải đáp FAQ, thông tin sự kiện, hướng dẫn check-in | Tất cả |
| **AI Content Generator** | Gợi ý viết mô tả sự kiện, tiêu đề, caption truyền thông | ClubOrganizer |

---

## 6. Quy trình nghiệp vụ cốt lõi

- **Phê duyệt khép kín đa tầng:** CLB → ICPDP → CTSV; đối tác → CTSV → Admin.
- **Vận hành & điểm danh thời gian thực:** đăng ký, bán vé online, vé QR định danh, kiểm soát check-in chống gian lận.
- **Quản trị & đánh giá đa chiều:** thu thập phản hồi, quản lý Master Data, thống kê hiệu suất CLB qua dashboard.

Quy trình phát triển theo **Agile/Scrum** (`To Do → In Progress → Review → Done`), quản lý trên Jira.

---

## 7. Triển khai

| Thành phần | Nền tảng | Ghi chú |
|---|---|---|
| Backend | Render | Blueprint `render.yaml`; free tier ngủ sau ~15 phút không truy cập |
| Frontend | Vercel | SPA, cấu hình trong `FE/vercel.json`, domain `fevent.qzz.io` |
| Database | MongoDB Atlas | — |
| Media | Cloudinary | Bắt buộc vì filesystem Render là ephemeral |

GitHub Actions (`.github/workflows/keep-alive.yml`) ping Render + Vercel mỗi 7 phút để tránh cold-start.

---

## 8. License

Xem tệp [LICENSE](./LICENSE).
