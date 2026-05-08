# Chuỗi Xanh Việt — Backend API

Backend viết bằng **Node.js**, **Express 5**, **TypeScript**, **Prisma** (PostgreSQL), có **Socket.IO** (chat) và **Swagger** (tài liệu API).

Tài liệu này hướng dẫn từng bước để người mới cũng có thể **cài đặt, tạo database, chạy migration và khởi động server** trên máy của mình.

---

## 1. Chuẩn bị trên máy (bắt buộc)

### 1.1. Cài Node.js và npm

- Cần **Node.js phiên bản 20 trở lên** (khuyến nghị 20 LTS hoặc 22).
- **npm** thường đi kèm Node (phiên bản 10 trở lên).

**Cách kiểm tra** (mở terminal: PowerShell, CMD, hoặc Git Bash):

```bash
node -v
npm -v
```

Nếu lệnh báo không tìm thấy, tải và cài Node từ trang chủ: [https://nodejs.org](https://nodejs.org) (bản **LTS**).

### 1.2. Cài PostgreSQL

Dự án dùng **PostgreSQL** làm database. Bạn cần một server PostgreSQL đang chạy (cài trực tiếp trên Windows hoặc dùng Docker).

**Cách đơn giản trên Windows**

1. Tải PostgreSQL cho Windows: [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Trong quá trình cài, ghi nhớ:
   - **mật khẩu** của user `postgres`
   - **cổng** (mặc định thường là `5432`)

**Tạo database mới** (ví dụ tên `chuoi_xanh`):

- Mở **pgAdmin** hoặc **SQL Shell (psql)** đi kèm PostgreSQL, chạy:

```sql
CREATE DATABASE chuoi_xanh;
```

**Hoặc dùng Docker** (nếu bạn đã cài Docker Desktop):

```bash
docker run --name chuoi-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=chuoi_xanh -p 5432:5432 -d postgres:16
```

Khi đó chuỗi kết nối mẫu sẽ là:

`postgresql://postgres:postgres@localhost:5432/chuoi_xanh`

---

## 2. Lấy mã nguồn và vào thư mục project

Nếu bạn đã có sẵn thư mục `chuoi-xanh-viet-be`, chỉ cần mở terminal **tại thư mục đó**.

Nếu clone từ Git:

```bash
git clone <url-repo-của-bạn>
cd chuoi-xanh-viet-be
```

---

## 3. Tạo file cấu hình `.env`

1. Trong thư mục `chuoi-xanh-viet-be`, tìm file **`.env.example`**.
2. **Sao chép** file đó và đổi tên thành **`.env`** (cùng cấp với `package.json`).

Mở `.env` bằng Notepad / VS Code và **điền các giá trị bắt buộc** bên dưới. Các dòng để trống trong `.env.example` thường là chuỗi rỗng — bạn phải thay bằng giá trị thật để đăng nhập và API hoạt động ổn định.

### 3.1. Biến bắt buộc để chạy local (nên làm đủ)

| Biến | Ý nghĩa |
|------|--------|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL. **Không** dùng giá trị placeholder như `"public"`. Định dạng: `postgresql://USER:PASSWORD@HOST:PORT/TEN_DATABASE` |
| `JWT_ACCESS_TOKEN_SECRET` | Chuỗi bí mật ký JWT (access token). Nên dài, ngẫu nhiên |
| `JWT_REFRESH_TOKEN_SECRET` | Chuỗi bí mật khác (refresh token), **khác** access |
| `JWT_RESET_PASSWORD_TOKEN_SECRET` | Chuỗi bí mật cho link đặt lại mật khẩu |
| `PASSWORD_HASH_SECRET` | Chuỗi bí mật dùng khi băm mật khẩu đăng nhập |

**Tạo chuỗi ngẫu nhiên** (chạy một lần, copy kết quả vào từng secret khác nhau):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Chạy lệnh trên **3–4 lần** để có đủ secret cho các biến JWT và `PASSWORD_HASH_SECRET`.

### 3.2. Nên có khi phát triển trên máy

| Biến | Gợi ý |
|------|--------|
| `NODE_ENV` | Đặt `development` để CORS và Socket.IO dễ gắn với frontend local (tránh bị chặn origin khi test) |
| `PORT` | Cổng HTTP. Trong `.env.example` là `8888`; nếu không set, code mặc định dùng **8000** |
| `FRONTEND_URL` | URL frontend (mặc định trong code là `http://localhost:3000`). Đổi nếu bạn chạy FE cổng khác (ví dụ Vite `5173`) và **không** dùng `NODE_ENV=development` |
| `PUBLIC_APP_URL` | URL app phía người dùng (QR, deep-link). Local thường `http://localhost:3000` |

### 3.3. Tùy chọn (không bắt buộc để server chạy)

- **Gửi email** (quên mật khẩu, …): `SMTP_*`, `CLIENT_RESET_PASSWORD_URL`
- **Neo dữ liệu lên blockchain (Sepolia)**: `SEPOLIA_RPC_URL`, `ANCHOR_WALLET_PRIVATE_KEY`, `ANCHOR_CONTRACT_ADDRESS`
- **Tính năng AI (Gemini)**: `GEMINI_API_KEYS`, …
- **Upload ảnh qua worker**: `IMAGE_WORKER_SERVICE_API`, `IMAGE_WORKER_SERVICE_KEY`

Chi tiết tên biến xem trong `.env.example`.

**Ví dụ khối tối thiểu trong `.env` (chỉnh `DATABASE_URL` và secrets cho đúng máy bạn):**

```env
NODE_ENV=development

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chuoi_xanh"

JWT_ACCESS_TOKEN_SECRET="thay-bang-chuoi-ngau-nhien-1"
JWT_ACCESS_TOKEN_EXPIRES_IN=1h
JWT_REFRESH_TOKEN_SECRET="thay-bang-chuoi-ngau-nhien-2"
JWT_REFRESH_TOKEN_EXPIRES_IN=7d
JWT_RESET_PASSWORD_TOKEN_SECRET="thay-bang-chuoi-ngau-nhien-3"
JWT_RESET_PASSWORD_TOKEN_EXPIRES_IN=1h

PASSWORD_HASH_SECRET="thay-bang-chuoi-ngau-nhien-4"

PORT=8000
FRONTEND_URL=http://localhost:3000
PUBLIC_APP_URL=http://localhost:3000
```

---

## 4. Cài dependency

Trong thư mục `chuoi-xanh-viet-be`:

```bash
npm install
```

---

## 5. Tạo bảng trong database (Prisma migrate)

Lệnh sau **áp toàn bộ migration** có sẵn trong `prisma/migrations` lên database bạn đã khai báo trong `DATABASE_URL`:

```bash
npx prisma migrate deploy
```

Sau đó tạo lại Prisma Client (nếu cần):

```bash
npm run prisma:generate
```

Nếu `migrate deploy` báo lỗi kết nối, kiểm tra PostgreSQL đã bật, `DATABASE_URL` đúng user/mật khẩu/tên DB.

---

## 6. (Khuyến nghị) Nạp dữ liệu mẫu

```bash
npm run seed
```

Script tạo user, farm, shop, … mẫu. Trong mã seed, mật khẩu mặc định cho user mẫu thường là **`123456`** (chỉ dùng để thử local, không dùng production).

---

## 7. Chạy server chế độ phát triển

```bash
npm run dev
```

Terminal sẽ in cổng đang lắng nghe, ví dụ:

- `Server is running on port 8000`
- `http://localhost:8000`

**Kiểm tra nhanh**

- Mở trình duyệt: `http://localhost:8000` (hoặc đúng `PORT` trong `.env`) — trang chủ trả về `Hello!`
- **Swagger UI**: `http://localhost:8000/api-docs` (nếu `PORT=8888` thì thay số cổng tương ứng)

**Socket.IO** dùng chung cổng HTTP, đường dẫn mặc định: `/socket.io/`.

---

## 8. Các lệnh npm hữu ích

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Chạy dev với nodemon, tự restart khi sửa file trong `src` |
| `npm run build` | `prisma generate` + biên dịch TypeScript ra thư mục `dist` |
| `npm run start` | Chạy bản đã build: `node dist/server.js` |
| `npm run prisma:generate` | Chỉ generate Prisma Client |
| `npm run seed` | Chạy `prisma/seed.ts` |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run prettier` / `npm run prettier:fix` | Kiểm tra / format Prettier |
| `npm run deploy:contract` | Deploy smart contract Hardhat lên Sepolia (cần cấu hình mạng và khóa — nâng cao) |

---

## 9. Chạy bản production trên máy

```bash
npm run build
npm run start
```

Nhớ set `NODE_ENV=production` và cấu hình `FRONTEND_URL` (và các biến bảo mật) phù hợp môi trường thật.

---

## 10. Docker (tùy chọn)

Trong repo có `Dockerfile` và `docker-compose.yml`. Compose **chỉ chạy container API**; bạn vẫn cần **PostgreSQL** (máy local hoặc server) và `DATABASE_URL` trỏ đúng chỗ.

Thông thường quy trình là:

1. Tạo DB và chạy `npx prisma migrate deploy` (có thể chạy trên máy host với cùng `DATABASE_URL` mà container sẽ dùng).
2. Tạo `.env` đầy đủ.
3. Chạy `docker compose up --build` (cổng map trong file compose có thể là **8001 → 8000** trong container — đọc `docker-compose.yml`).

---

## 11. Gỡ lỗi thường gặp

- **`Can't reach database` / Prisma connection error**  
  PostgreSQL chưa chạy, sai mật khẩu, sai tên DB, hoặc sai cổng trong `DATABASE_URL`.

- **Đăng nhập / JWT lỗi**  
  Kiểm tra các biến `JWT_*_SECRET` và `PASSWORD_HASH_SECRET` đã điền, không để trống.

- **Frontend gọi API bị CORS**  
  Thêm `NODE_ENV=development` trong `.env` khi dev, hoặc set `FRONTEND_URL` đúng origin frontend và đảm bảo origin nằm trong danh sách cho phép (xem `src/config/cors.ts`).

- **Cổng không đúng**  
  Xem giá trị `PORT` trong `.env`. Không set thì mặc định **8000** (trừ khi bạn đã set giá trị khác).

---

## 12. Cấu trúc thư mục (tham khảo)

- `src/server.ts` — Điểm vào, khởi tạo HTTP + Socket.IO  
- `src/routers` — Gom route API  
- `src/modules/*` — Nghiệp vụ theo module  
- `prisma/schema.prisma` — Schema database  
- `prisma/migrations/` — Lịch sử migration  
- `.env` — Cấu hình bí mật (không commit lên Git)

Nếu làm đúng các bước **cài Node + PostgreSQL → `.env` → `npm install` → `migrate deploy` → `npm run dev`**, bạn sẽ có API chạy local và có thể mở Swagger tại `/api-docs`.
