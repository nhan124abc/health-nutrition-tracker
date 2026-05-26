# Health Nutrition Tracker - Ke Hoach Task Va Tien Do

Cap nhat lan cuoi: 2026-05-25

## Cach Dung Bang Nay

Dung file nay lam nguon de tao GitHub Issues va GitHub Projects.

Cot nen dung trong GitHub Project:

| Cot | Y nghia |
| --- | --- |
| Backlog | Viec nen lam, nhung chua ro hoac chua gap |
| Ready | Da ro yeu cau, co the bat dau lam |
| In Progress | Dang thuc hien |
| Review/Test | Da co code, can test hoac review |
| Done | Da hoan thanh, da merge, da test |

Label nen dung cho GitHub Issues:

`frontend`, `backend`, `api-gateway`, `auth-service`, `user-service`, `nutrition-service`, `meal-service`, `activity-service`, `analytics-service`, `database`, `docs`, `test`, `bug`, `feature`, `refactor`, `priority-high`, `priority-medium`, `priority-low`

## Tinh Trang Hien Tai

| Khu vuc | Tinh trang | Tien do uoc tinh |
| --- | --- | --- |
| Do sach repo | Repo dang co nhieu thay doi chua commit; `README.md` goc dang co conflict marker; `logs/` va `target/` dang xuat hien trong local | 35% |
| Kien truc backend | Backend Spring Boot multi-module da co gateway, auth, user, nutrition, meal, activity, analytics | 60% |
| API gateway | Route dang cau hinh theo `/api/v1/**`; da co CORS va Swagger aggregation | 65% |
| Auth | Da co register/login/refresh/logout; reset password va `/me` con TODO | 55% |
| User profile | Da co API profile va body metrics | 65% |
| Nutrition | Da co API danh sach food, chi tiet, barcode, tao food, category | 60% |
| Meals | Da co API meal theo ngay, tao, xoa, summary | 55% |
| Activity | Da co API activity log, types, summary; frontend dang mong doi plans/steps nhung backend chua expose | 45% |
| Analytics | Da co daily/weekly/monthly/streak; can kiem tra dong du lieu va do moi cua summary | 45% |
| Frontend | Da co React routes va thu muc features; nhieu man hinh van co dau hieu dung sample data hoac moi ket noi mot phan | 50% |
| Testing | Da co smoke test; con thieu integration/e2e test | 25% |
| Deployment | Da co Dockerfile va compose; file compose hien ten la `docker-compse.yml` | 35% |

## Cac Milestone MVP

### MVP 0 - On Dinh Repo

Muc tieu: lam cho du an sach, build duoc, de tiep tuc phat trien an toan.

| ID | Trang thai | Task | Labels | Uu tien | Tieu chi hoan thanh |
| --- | --- | --- | --- | --- | --- |
| M0-01 | Ready | Sua conflict marker trong `README.md` goc | `docs`, `bug`, `priority-high` | Cao | `README.md` khong con `<<<<<<<`, `=======`, `>>>>>>>`; noi dung mo ta dung frontend/backend |
| M0-02 | Ready | Quyet dinh cach xu ly `logs/` va `target/` | `docs`, `refactor`, `priority-high` | Cao | `.gitignore` bo qua output sinh ra; `git status` chi con thay doi source co chu dich |
| M0-03 | Ready | Doi ten hoac ghi ro file `backend/docker-compse.yml` | `backend`, `docs`, `priority-medium` | Trung binh | Developer co the chay Docker Compose ma khong phai doan ten file |
| M0-04 | Ready | Kiem tra Maven compile cho tat ca backend modules | `backend`, `test`, `priority-high` | Cao | Lenh `mvn -DskipTests compile` chay thanh cong trong `backend/` |
| M0-05 | Ready | Kiem tra baseline frontend install/build/test | `frontend`, `test`, `priority-high` | Cao | Biet ro trang thai pass/fail cua `npm test -- --watchAll=false` va `npm run build` |

### MVP 1 - Dang Nhap, Session, Ho So

Muc tieu: nguoi dung co the dang ky, dang nhap, giu phien dang nhap va cap nhat ho so suc khoe.

| ID | Trang thai | Task | Labels | Uu tien | Tieu chi hoan thanh |
| --- | --- | --- | --- | --- | --- |
| M1-01 | Ready | Dong bo frontend auth flow voi response cua `/api/v1/auth/*` | `frontend`, `auth-service`, `priority-high` | Cao | Login/register luu access token va refresh token; dang nhap thanh cong chuyen ve dashboard |
| M1-02 | Ready | Lam that endpoint `/api/v1/auth/me` | `backend`, `auth-service`, `priority-high` | Cao | Endpoint tra ve user id/email/role hien tai tu token hoac identity do gateway truyen vao |
| M1-03 | Ready | Hoan thien backend forgot/reset password | `backend`, `auth-service`, `priority-medium` | Trung binh | Reset endpoint kiem tra OTP va doi mat khau; frontend hien thi duoc thanh cong/loi |
| M1-04 | Ready | Ket noi trang Profile voi User Profile API | `frontend`, `user-service`, `priority-high` | Cao | Profile load du lieu cu, luu thay doi va hien thi loi validation |
| M1-05 | Backlog | Them test cho profile va body metrics | `backend`, `user-service`, `test` | Trung binh | Test bao phu tao/cap nhat profile va tao metric |

### MVP 2 - Dinh Duong Va Nhat Ky Bua An

Muc tieu: nguoi dung co the tim thuc pham va ghi nhat ky bua an theo ngay.

| ID | Trang thai | Task | Labels | Uu tien | Tieu chi hoan thanh |
| --- | --- | --- | --- | --- | --- |
| M2-01 | Ready | Kiem tra UX tim kiem nutrition voi API backend hien co | `frontend`, `nutrition-service`, `priority-high` | Cao | Search/list/category/barcode goi API that va co loading/empty/error state |
| M2-02 | Ready | Them phan trang cho danh sach food | `frontend`, `nutrition-service`, `priority-medium` | Trung binh | Bang food chuyen trang duoc ma khong mat search/filter hien tai |
| M2-03 | Ready | Ket noi meal diary voi API list/create/delete meal | `frontend`, `meal-service`, `priority-high` | Cao | User xem meal theo ngay, them bua an, xoa bua an va thay tong calo ngay |
| M2-04 | Backlog | Quyet dinh co can API sua/xoa tung meal item khong | `backend`, `meal-service`, `feature` | Trung binh | Hoac backend ho tro sua/xoa item, hoac frontend UX chi theo meal-level CRUD |
| M2-05 | Backlog | Seed them du lieu mon an Viet Nam | `database`, `nutrition-service`, `priority-medium` | Trung binh | Co du food pho bien kem category va macro de demo |

### MVP 3 - Van Dong, Nuoc, Chi So Co The

Muc tieu: nguoi dung co the theo doi van dong, nuoc uong va tien trinh co the.

| ID | Trang thai | Task | Labels | Uu tien | Tieu chi hoan thanh |
| --- | --- | --- | --- | --- | --- |
| M3-01 | Ready | Dong bo frontend activity plans/steps voi API backend | `frontend`, `backend`, `activity-service`, `priority-high` | Cao | Hoac backend them `/activities/plans` va `/activities/steps`, hoac frontend bo/an cac call nay |
| M3-02 | Ready | Ket noi man hinh activity log voi API that | `frontend`, `activity-service`, `priority-high` | Cao | User xem, tao, xoa activity va thay summary trong ngay |
| M3-03 | Ready | Them API water logging hoac loai khoi MVP | `backend`, `user-service`, `frontend`, `priority-medium` | Trung binh | Water tracking co flow API ro rang hoac duoc danh dau chua lam trong MVP |
| M3-04 | Ready | Ket noi Body Metrics voi `/users/me/metrics` | `frontend`, `user-service`, `priority-medium` | Trung binh | User them chi so co the va xem lich su tu backend |
| M3-05 | Backlog | Them chart xu huong chi so co the | `frontend`, `feature` | Thap | Chart hien thi xu huong can nang/BMI/body fat tu API |

### MVP 4 - Dashboard, Bao Cao, Analytics

Muc tieu: dashboard va bao cao hien du lieu that cua nguoi dung.

| ID | Trang thai | Task | Labels | Uu tien | Tieu chi hoan thanh |
| --- | --- | --- | --- | --- | --- |
| M4-01 | Ready | Ket noi Dashboard cards voi summary meal/activity/user/analytics | `frontend`, `analytics-service`, `priority-high` | Cao | So lieu dashboard lay tu API va co empty/loading/error state |
| M4-02 | Ready | Ket noi Reports voi API daily/weekly/monthly analytics | `frontend`, `analytics-service`, `priority-high` | Cao | Reports doi duoc khoang ngay va ve chart bang du lieu API |
| M4-03 | Backlog | Kiem tra dong tong hop du lieu analytics | `backend`, `analytics-service`, `meal-service`, `activity-service`, `priority-high` | Cao | Log meal/activity cap nhat daily summary dung nhu mong doi |
| M4-04 | Backlog | Them test cho analytics service | `backend`, `analytics-service`, `test` | Trung binh | Daily/weekly/monthly calculation co test lap lai duoc |

### MVP 5 - Admin Va Quan Ly Noi Dung

Muc tieu: admin quan ly user, food, exercise, submission va report sau khi flow nguoi dung chinh da on dinh.

| ID | Trang thai | Task | Labels | Uu tien | Tieu chi hoan thanh |
| --- | --- | --- | --- | --- | --- |
| M5-01 | Backlog | Dinh nghia contract API cho admin | `backend`, `frontend`, `priority-medium` | Trung binh | Admin pages co endpoint backend tuong ung hoac duoc danh dau demo-only |
| M5-02 | Backlog | Lam flow duyet food user submit | `backend`, `nutrition-service`, `frontend` | Trung binh | Admin co the approve/reject food item do user gui |
| M5-03 | Backlog | Lam danh sach user va quan ly role | `backend`, `auth-service`, `user-service`, `frontend` | Thap | Admin co the xem user va cap nhat status/role an toan |

### MVP 6 - Chat Luong, Bao Mat, Trien Khai

Muc tieu: chuan bi du an cho demo hoac moi truong gan production.

| ID | Trang thai | Task | Labels | Uu tien | Tieu chi hoan thanh |
| --- | --- | --- | --- | --- | --- |
| M6-01 | Backlog | Chuan hoa error response giua cac service | `backend`, `refactor`, `priority-medium` | Trung binh | Frontend co the xu ly loi theo mot format thong nhat |
| M6-02 | Backlog | Them integration test qua API gateway | `backend`, `api-gateway`, `test` | Cao | Flow auth/profile/nutrition/meal/activity smoke chay qua port 8080 |
| M6-03 | Backlog | Them frontend e2e happy path | `frontend`, `test` | Trung binh | Tu dong test register/login/profile/meal/activity/dashboard |
| M6-04 | Backlog | Chuan bi `.env.example` cho frontend va backend | `docs`, `backend`, `frontend` | Trung binh | Developer moi co the cau hinh app tu file mau |
| M6-05 | Backlog | Kiem tra full-stack bang Docker Compose | `backend`, `frontend`, `database`, `test` | Cao | MySQL/Redis/Kafka/services/gateway chay duoc theo lenh trong docs |

## Sprint Dau Tien De Xuat

Thoi gian muc tieu: 5 den 7 ngay lam viec.

Muc tieu sprint: lam sach repo, dam bao build duoc, va hoan thanh flow nguoi dung dau tien: dang ky/dang nhap -> profile -> dashboard co khung du lieu that.

| Ngay | Trong tam | Task |
| --- | --- | --- |
| Ngay 1 | Don repo | M0-01, M0-02, M0-03 |
| Ngay 2 | Kiem tra build | M0-04, M0-05 |
| Ngay 3 | Auth integration | M1-01, M1-02 |
| Ngay 4 | Profile integration | M1-04 |
| Ngay 5 | Dashboard baseline | M4-01 voi empty/loading/error states |
| Du phong | Fix/test/docs | Xu ly blocker phat sinh tu build hoac auth/profile |

## Mau GitHub Issue

Dung mau nay khi tao issue:

```md
## Muc tieu

Sau khi lam xong task nay, dieu gi phai dung?

## Pham vi

- [ ] Backend
- [ ] Frontend
- [ ] Database
- [ ] Tests
- [ ] Docs

## Tieu chi hoan thanh

- [ ] ...
- [ ] ...

## Ghi chu

File, endpoint, rang buoc hoac thong tin lien quan.
```

## Rui Ro Va Quyet Dinh Can Chot

| Rui ro / Quyet dinh | Anh huong | De xuat xu ly |
| --- | --- | --- |
| `README.md` goc dang bi conflict | Lam nguoi moi kho setup va hieu sai du an | Sua truoc khi viet them docs |
| Frontend co man hinh/call API ma backend chua ho tro | UI co the goi endpoint khong ton tai | Dong bo trong MVP 2 va MVP 3 |
| Backend docs co the ghi endpoint khac voi controller hien tai | Tester dung sai API path | Cap nhat docs dua tren controller that |
| Output sinh ra xuat hien trong repo status | Kho review code that | Sua `.gitignore` va don co chu dich |
| Analytics phu thuoc dong du lieu giua service | Dashboard co the hien stale/empty data | Them integration test meal/activity -> analytics |

