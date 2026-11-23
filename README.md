# BIG CITY Frontend

Giao diện BIG CITY Roleplay dùng TypeScript, HTML và CSS.

## Chuẩn bị

Cần Node.js 20+. Đặt hai repo cạnh nhau với tên thư mục `frontend` và `backend` để bước build đọc nội dung từ `backend/data`.

```powershell
git clone https://github.com/dinhtay06/bigcitysrc-fe.git frontend
git clone https://github.com/dinhtay06/bigcitysrc-be.git backend
cd frontend
npm ci
npm run build
```

Bản build nằm trong `frontend/dist`. Chạy backend Java từ thư mục dự án hoặc từ `backend` theo README của backend để sử dụng đăng ký, đăng nhập, hồ sơ, hỗ trợ và payOS.

## Sửa giao diện

| Tệp | Nội dung |
| --- | --- |
| `src/index.html` | Bố cục trang |
| `src/styles.css` | Giao diện và responsive |
| `src/app.ts` | Cổng cư dân và kết nối API |
| `public/` | Logo và ảnh nền |
| `../backend/data/` | Bản tin, luật và cấu hình cộng đồng |

Chạy lại `npm run build` sau khi sửa. Khóa payOS được cấu hình trong môi trường backend.
