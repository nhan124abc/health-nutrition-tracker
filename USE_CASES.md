# Danh Sach Use Case / Chuc Nang Chinh

Cap nhat lan cuoi: 2026-05-26

Tai lieu nay gom cac API hien co thanh cac chuc nang chinh theo goc nhin nguoi dung/he thong.

## Tong Quan

Du an hien co 6 nhom chuc nang chinh:

| STT | Nhom chuc nang | Service chinh | So use case hien co | Trang thai tong quan |
| --- | --- | --- | ---: | --- |
| 1 | Xac thuc va tai khoan | Auth Service | 7 | Co ban da co, con TODO o `/me` va reset password |
| 2 | Ho so suc khoe va chi so co the | User Service | 4 | API nen tang da co |
| 3 | Dinh duong va thuc pham | Nutrition Service | 5 | API tra cuu/tao food da co |
| 4 | Nhat ky bua an | Meal Service | 5 | API meal theo ngay da co |
| 5 | Van dong va tap luyen | Activity Service | 5 | API log activity da co, chua co steps/plans |
| 6 | Bao cao va thong ke | Analytics Service | 4 | API report da co, can kiem tra dong du lieu |

Tong cong: 30 use case/API nghiep vu dang co trong controller.

Neu tinh theo "chuc nang lon" de quan ly project, nen xem la 6 module chinh.

## 1. Xac Thuc Va Tai Khoan

Service: Auth Service

Muc tieu: cho phep nguoi dung dang ky, dang nhap, duy tri phien dang nhap, dang xuat va khoi phuc mat khau.

So chuc nang hien co: 7 chuc nang chinh.

| ID | Chuc nang | Public/Protected | API lien quan | Trang thai |
| --- | --- | --- | --- | --- |
| AUTH-01 | Dang ky tai khoan | Public | `POST /api/v1/auth/register` | Da co |
| AUTH-02 | Dang nhap | Public | `POST /api/v1/auth/login` | Da co |
| AUTH-03 | Lam moi access token | Public | `POST /api/v1/auth/refresh` | Da co |
| AUTH-04 | Dang xuat | Protected | `POST /api/v1/auth/logout` | Da co |
| AUTH-05 | Quen mat khau | Public | `POST /api/v1/auth/password/forgot` | Da co OTP |
| AUTH-06 | Dat lai mat khau | Public | `POST /api/v1/auth/password/reset` | Chua hoan thien doi password |
| AUTH-07 | Lay thong tin user hien tai | Protected | `GET /api/v1/auth/me` | Con TODO |

Chuc nang phu / cau hinh them:

| ID | Chuc nang | Public/Protected | API lien quan | Trang thai |
| --- | --- | --- | --- | --- |
| AUTH-08 | Bat dau OAuth2 login | Protected qua gateway | `GET /api/v1/auth/oauth2/authorize/{provider}` | Can xem lai public rule |
| AUTH-09 | Xac minh email | Configured Public | `GET /api/v1/auth/verify-email` | Gateway co allow-list, chua thay controller |

Nen quan ly tren task board thanh 3 epic:

- Auth Dashboard: man hinh login/register/forgot/logout.
- Auth Custom API: register, login, refresh, logout, forgot/reset, me.
- Auth Call API: frontend goi API, luu token, auto refresh, protected route.

## 2. Ho So Suc Khoe Va Chi So Co The

Service: User Service

Muc tieu: quan ly ho so suc khoe ca nhan va lich su chi so co the.

So chuc nang hien co: 4 chuc nang chinh.

| ID | Chuc nang | Public/Protected | API lien quan | Trang thai |
| --- | --- | --- | --- | --- |
| USER-01 | Xem ho so suc khoe | Protected | `GET /api/v1/users/me/profile` | Da co |
| USER-02 | Cap nhat ho so suc khoe | Protected | `PUT /api/v1/users/me/profile` | Da co |
| USER-03 | Ghi chi so co the | Protected | `POST /api/v1/users/me/metrics` | Da co |
| USER-04 | Xem lich su chi so co the | Protected | `GET /api/v1/users/me/metrics` | Da co |

Chuc nang nen co tiep theo:

- Theo doi nuoc uong.
- Cai dat thong bao.
- Muc tieu suc khoe hang ngay.

## 3. Dinh Duong Va Thuc Pham

Service: Nutrition Service

Muc tieu: cho phep nguoi dung tra cuu thuc pham, xem dinh duong va dong gop thuc pham moi.

So chuc nang hien co: 5 chuc nang chinh.

| ID | Chuc nang | Public/Protected | API lien quan | Trang thai |
| --- | --- | --- | --- | --- |
| NUTRI-01 | Tim kiem / lay danh sach thuc pham | Protected | `GET /api/v1/nutrition/foods` | Da co |
| NUTRI-02 | Xem chi tiet thuc pham | Protected | `GET /api/v1/nutrition/foods/{id}` | Da co |
| NUTRI-03 | Tra cuu thuc pham bang barcode | Protected | `GET /api/v1/nutrition/foods/barcode/{code}` | Da co |
| NUTRI-04 | Them thuc pham moi | Protected | `POST /api/v1/nutrition/foods` | Da co |
| NUTRI-05 | Xem danh muc thuc pham | Protected | `GET /api/v1/nutrition/categories` | Da co |

Chuc nang nen co tiep theo:

- Admin duyet food user submit.
- Recipe / cong thuc nau an.
- Import dataset thuc pham Viet Nam day du hon.

## 4. Nhat Ky Bua An

Service: Meal Service

Muc tieu: cho phep nguoi dung ghi lai bua an trong ngay va tinh tong calo.

So chuc nang hien co: 5 chuc nang chinh.

| ID | Chuc nang | Public/Protected | API lien quan | Trang thai |
| --- | --- | --- | --- | --- |
| MEAL-01 | Xem danh sach bua an theo ngay | Protected | `GET /api/v1/meals` | Da co |
| MEAL-02 | Xem chi tiet mot bua an | Protected | `GET /api/v1/meals/{id}` | Da co |
| MEAL-03 | Tao bua an moi | Protected | `POST /api/v1/meals` | Da co |
| MEAL-04 | Xoa bua an | Protected | `DELETE /api/v1/meals/{id}` | Da co |
| MEAL-05 | Xem tong ket bua an trong ngay | Protected | `GET /api/v1/meals/summary` | Da co |

Chuc nang nen co tiep theo:

- Sua bua an.
- Them/sua/xoa tung mon trong bua an.
- Meal plan / ke hoach an uong.
- Favorite food.

## 5. Van Dong Va Tap Luyen

Service: Activity Service

Muc tieu: cho phep nguoi dung ghi lai hoat dong the chat va xem tong ket trong ngay.

So chuc nang hien co: 5 chuc nang chinh.

| ID | Chuc nang | Public/Protected | API lien quan | Trang thai |
| --- | --- | --- | --- | --- |
| ACT-01 | Xem danh sach hoat dong theo ngay | Protected | `GET /api/v1/activities` | Da co |
| ACT-02 | Ghi log hoat dong | Protected | `POST /api/v1/activities` | Da co |
| ACT-03 | Xoa log hoat dong | Protected | `DELETE /api/v1/activities/{id}` | Da co |
| ACT-04 | Xem danh muc loai hoat dong | Protected | `GET /api/v1/activities/types` | Da co |
| ACT-05 | Xem tong ket hoat dong trong ngay | Protected | `GET /api/v1/activities/summary` | Da co |

Chuc nang frontend dang mong doi nhung backend chua co:

| ID | Chuc nang | API frontend dang goi | Trang thai |
| --- | --- | --- | --- |
| ACT-06 | Ke hoach tap luyen | `/api/v1/activities/plans` | Chua co controller |
| ACT-07 | Ghi so buoc chan | `/api/v1/activities/steps` | Chua co controller |

## 6. Bao Cao Va Thong Ke

Service: Analytics Service

Muc tieu: tong hop du lieu dinh duong, bua an, van dong va streak de hien dashboard/report.

So chuc nang hien co: 4 chuc nang chinh.

| ID | Chuc nang | Public/Protected | API lien quan | Trang thai |
| --- | --- | --- | --- | --- |
| ANA-01 | Xem tong ket suc khoe theo ngay | Protected | `GET /api/v1/analytics/daily` | Da co |
| ANA-02 | Xem bao cao theo tuan | Protected | `GET /api/v1/analytics/weekly` | Da co |
| ANA-03 | Xem bao cao theo thang | Protected | `GET /api/v1/analytics/monthly` | Da co |
| ANA-04 | Xem streak hien tai | Protected | `GET /api/v1/analytics/streak` | Da co |

Chuc nang nen co tiep theo:

- Health insights / goi y suc khoe.
- Admin overview.
- Kiem tra dong du lieu meal/activity sang analytics.

## Tong Ket Theo Muc Do Uu Tien

### Nen lam truoc

| Uu tien | Use case | Ly do |
| --- | --- | --- |
| 1 | AUTH-01, AUTH-02, AUTH-03, AUTH-04 | La nen tang de tat ca API protected hoat dong |
| 2 | AUTH-07 | Frontend can biet user hien tai |
| 3 | USER-01, USER-02 | Can profile de dashboard va tinh chi so |
| 4 | NUTRI-01, NUTRI-02, NUTRI-05 | Can food data de tao meal |
| 5 | MEAL-01, MEAL-03, MEAL-05 | Flow nhat ky an uong cot loi |
| 6 | ACT-01, ACT-02, ACT-05 | Flow van dong cot loi |
| 7 | ANA-01, ANA-02, ANA-03 | Dashboard/report dung du lieu that |

### Can sua hoac chot lai

| Use case | Van de |
| --- | --- |
| AUTH-06 | Reset password chua doi mat khau that |
| AUTH-07 | `/auth/me` con TODO |
| AUTH-08 | OAuth2 authorize co the dang bi gateway yeu cau JWT, can xem lai |
| AUTH-09 | Gateway public verify-email nhung chua thay controller |
| ACT-06 | Frontend co call activity plans nhung backend chua co |
| ACT-07 | Frontend co call activity steps nhung backend chua co |

