# Health & Nutrition Tracker

Ứng dụng frontend ReactJS cho hệ thống theo dõi sức khỏe và dinh dưỡng. Dự án đang tập trung vào giao diện quản lý các chỉ số sức khỏe, nhật ký dinh dưỡng, vận động, báo cáo và cấu trúc layout responsive.

## Công nghệ sử dụng

- ReactJS 19
- Create React App / `react-scripts`
- React Router DOM
- React-Bootstrap và Bootstrap 5
- React Icons
- Chart.js và `react-chartjs-2`
- i18next và `react-i18next`
- flag-icons
- Axios

## Chức năng hiện có

- Layout chính gồm Header, Sidebar, Content Area và Footer.
- Sidebar có 2 trạng thái:
  - Mở rộng: hiển thị icon và tên menu.
  - Thu nhỏ: chỉ hiển thị icon, có tooltip khi hover.
- Header có:
  - Nút hamburger để thu/mở sidebar hoặc mở menu mobile.
  - Thanh tìm kiếm nhanh.
  - Icon trò chuyện AI mở popup chat.
  - Dropdown chọn ngôn ngữ bằng cờ Việt Nam/Mỹ.
  - Icon người dùng với dropdown hồ sơ, cài đặt, đăng xuất.
- Hỗ trợ đa ngôn ngữ Việt/Anh.
- Dashboard có Card chỉ số BMI, TDEE, mục tiêu calo và biểu đồ Chart.js.
- Nhật ký dinh dưỡng có Tabs theo bữa ăn, Table món ăn và Modal thêm món.
- Hồ sơ sức khỏe có Bootstrap Form, validation và tính BMI.
- Theo dõi vận động có ListGroup bài tập, Alert cảnh báo và ProgressBar nước uống.
- Một số module còn là placeholder để phát triển tiếp: Nước, Mục tiêu, Tin tức, Cài đặt.

## Cấu trúc thư mục chính

```text
src/
  api/
    api.js                 # Axios client, tự gắn JWT token
  components/
    LanguageSwitcher.jsx   # Dropdown chuyển ngôn ngữ
    StatCard.jsx
  layouts/
    MainLayout.jsx         # Header, Sidebar, Outlet, Footer
  locales/
    translation_vi.json
    translation_en.json
  pages/
    ActivityTracker.jsx
    Dashboard.jsx
    FoodDiary.jsx
    Login.jsx
    PlaceholderPage.jsx
    Profile.jsx
    Reports.jsx
  App.jsx                  # Khai báo route
  i18n.js                  # Cấu hình i18next
  index.css                # CSS dùng chung toàn dự án
  index.js                 # Entry point
```

## Các route hiện tại

| Route | Màn hình |
| --- | --- |
| `/login` | Đăng nhập |
| `/dashboard` | Dashboard |
| `/nutrition` | Nhật ký dinh dưỡng |
| `/food-diary` | Redirect sang `/nutrition` |
| `/activity` | Theo dõi vận động |
| `/water` | Placeholder Nước |
| `/goals` | Placeholder Mục tiêu |
| `/reports` | Báo cáo |
| `/news` | Placeholder Tin tức |
| `/settings` | Placeholder Cài đặt |
| `/profile` | Hồ sơ sức khỏe |

## Cấu hình môi trường

File `.env` hiện tại:

```env
REACT_APP_DISABLE_AUTH=true
```

Ý nghĩa:

- `REACT_APP_DISABLE_AUTH=true`: bỏ qua kiểm tra đăng nhập để tiện phát triển giao diện.
- `REACT_APP_DISABLE_AUTH=false`: bật lại bảo vệ route bằng JWT.

Khi đổi `.env`, cần restart dev server.

Nếu muốn cấu hình backend API:

```env
REACT_APP_API_URL=http://localhost:8080/api
```

Nếu không khai báo, frontend mặc định gọi:

```text
http://localhost:8080/api
```

## Cài đặt và chạy dự án

Cài dependency:

```bash
npm install
```

Chạy môi trường development:

```bash
npm.cmd start
```

Mặc định ứng dụng chạy ở:

```text
http://localhost:3000
```

Nếu cổng `3000` đang bận, có thể chạy bằng cổng khác:

```bash
set PORT=3001 && npm.cmd start
```

## Build production

```bash
npm.cmd run build
```

Kết quả build nằm trong thư mục:

```text
build/
```

## Chạy test

```bash
npm.cmd test -- --watchAll=false
```

Hiện tại test đang là smoke test đơn giản cho component thống kê.

## Xác thực và JWT

File Axios client nằm tại:

```text
src/api/api.js
```

Client tự lấy JWT từ:

```js
localStorage.getItem('jwtToken')
```

và gắn vào header:

```http
Authorization: Bearer <token>
```

Trang đăng nhập gọi endpoint:

```text
POST /auth/login
```

Frontend chấp nhận response có `token` hoặc `accessToken`.

## Đa ngôn ngữ

Cấu hình i18n nằm tại:

```text
src/i18n.js
```

File dịch:

```text
src/locales/translation_vi.json
src/locales/translation_en.json
```

Cách dùng trong component:

```jsx
import { useTranslation } from 'react-i18next';

function Example() {
  const { t } = useTranslation();

  return <button>{t('buttons.save')}</button>;
}
```

Chuyển ngôn ngữ:

```js
i18n.changeLanguage('vi');
i18n.changeLanguage('en');
```

Lựa chọn ngôn ngữ được lưu trong `localStorage` với key:

```text
i18nextLng
```

## Ghi chú phát triển

- Toàn bộ CSS đang được gom trong `src/index.css`.
- Layout dùng màu chủ đạo xanh sức khỏe `#28a745`.
- Popup AI hiện mới là giao diện, chưa kết nối backend hoặc API AI.
- Một số package như `recharts`, `jspdf`, `xlsx`, `redux` hiện có trong dependency nhưng chưa phải phần chính của luồng UI mới.
- Khi thêm module mới, nên bổ sung route trong `src/App.jsx`, menu trong `src/layouts/MainLayout.jsx` và key dịch trong 2 file JSON locale.
