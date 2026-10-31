# Original User Request

## Initial Request — 2026-10-30T14:57:09Z

Khởi tạo và lập trình hoàn chỉnh ứng dụng Android "Voyager's Cosmic Hydration" sẵn sàng cho production bằng React + TypeScript + Vite + Tailwind CSS + Lucide Icons + Capacitor Android, theo dõi và nhắc uống nước với chủ đề nhân vật Voyager (Reverse: 1999).

Working directory: d:\uống nước
Integrity mode: development

References:
- Base character image: C:/Users/manha/.gemini/antigravity/brain/f2a2ac03-84b6-43e0-ae8e-3472cba79c9a/.user_uploaded/media_1793371487089_cd42a7d2.png
- Open-Meteo Weather API: https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code

## Requirements

### R1. Khởi tạo dự án & Cài đặt thư viện
- Khởi tạo dự án với Vite, React, TypeScript và Tailwind CSS.
- Cài đặt các thư viện: lucide-react, canvas-confetti.
- Cài đặt và cấu hình Capacitor Android cùng các plugin: @capacitor/core, @capacitor/cli, @capacitor/android, @capacitor/local-notifications, @capacitor/geolocation, @capacitor/preferences, @capacitor/filesystem.
- Tuyệt đối không viết code rút gọn, không dùng // TODO hay placeholder. Toàn bộ tính năng phải được lập trình hoàn chỉnh.

### R2. Logic Tính Nước & Thời Tiết (src/utils/hydrationEngine.ts)
- Gọi API thời tiết miễn phí Open-Meteo (https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code) dựa trên GPS thiết bị. Nếu người dùng tắt GPS hoặc từ chối cấp quyền, mặc định lấy tọa độ Hà Nội/Vinh.
- Công thức tính mục tiêu nước hằng ngày ($W_{total}$):
  * Nước cơ bản: $W_{base} = \text{Cân nặng (kg)} \times 35\text{ (ml)}$.
  * Mức vận động ($W_{activity}$): Ít vận động ($+0\text{ ml}$), Vừa ($+350\text{ ml}$), Cao ($+700\text{ ml}$).
  * Phụ thu thời tiết ($W_{weather}$): Cộng $+250\text{ ml}$ nếu nhiệt độ $28^\circ\text{C} - 32^\circ\text{C}$; cộng $+500\text{ ml}$ nếu $> 32^\circ\text{C}$; cộng thêm $+150\text{ ml}$ nếu độ ẩm $< 40\%$.
  * Tổng: $W_{total} = W_{base} + W_{activity} + W_{weather}$ (làm tròn đến $50\text{ ml}$ hoặc $0,1\text{ L}$).
- Lưu trữ offline: Lưu toàn bộ state vào localStorage và @capacitor/preferences để bảo toàn dữ liệu khi đóng ứng dụng.

### R3. Component Nhân vật Chibi Voyager & Quản lý Hình ảnh (src/components/VoyagerChibi.tsx)
- Sử dụng tài nguyên ảnh gốc được đính kèm (`C:/Users/manha/.gemini/antigravity/brain/f2a2ac03-84b6-43e0-ae8e-3472cba79c9a/.user_uploaded/media_1793371487089_cd42a7d2.png`) và tạo thêm các biến thể hình ảnh biểu cảm cho nhân vật Chibi Voyager (Reverse: 1999) với mũ thủy thủ trắng, khăn choàng bầu trời sao, mái tóc xanh ngân hà và đàn violin.
- Hỗ trợ 5 trạng thái biểu cảm: idle, happy, sleeping, gentle, strict (kéo đàn violin).
- Hỗ trợ hiển thị ảnh PNG/GIF tùy chỉnh nếu người dùng tải ảnh từ thiết bị lên.

### R4. 5 Màn hình chính theo Card-UI viền đậm 2px border-[#1E293B]
- Giữ cố định thanh điều hướng dưới cùng gồm 5 tab: Nhắc nước, Nhật ký, Hôm nay, Thống kê, Cá nhân. Loại bỏ 100% tính năng VIP/Premium hoặc ổ khóa trả phí.
- Tab Hôm nay (`src/tabs/TodayTab.tsx`):
  * Header: Góc trái là huy hiệu chuỗi ngày streak 🔥 {streak}, ở giữa là tiêu đề Hôm nay, góc phải là Widget Thời tiết hiển thị nhiệt độ, độ ẩm hiện tại và lượng ml nước cộng thêm.
  * Trung tâm: Hiển thị số lớn lượng nước đã uống / mục tiêu (ví dụ 1,0 / 1,6 L) và dòng nhắc số ly còn thiếu (Thêm X ly >).
  * Bể Ngân Hà: Hiệu ứng sóng nước xanh ánh sao dâng lên theo % mục tiêu, vạch đích nét đứt ngang có phao ngôi sao bên phải, ở giữa là Chibi Voyager lơ lửng.
  * Cụm nút: Nút + Tự nhập mở modal nhập số ml tùy ý và 4 thẻ nút bấm nhanh có viền đậm: +50 ml, +150 ml, +250 ml (mặc định có dấu tích), +500 ml.
- Tab Nhắc nước (`src/tabs/ReminderTab.tsx`):
  * Thẻ Nhắc lần tới: Chibi Voyager cầm chuông ngân hà, đồng hồ đếm ngược tới lần nhắc kế tiếp và nút gạt bật/tắt Nhắc uống nước kết nối trực tiếp với @capacitor/local-notifications.
  * Mục Cách nhắc: 3 thẻ chọn viền đậm gồm Nhẹ nhàng (thưa), Thông minh (tự tính theo lượng nước còn thiếu - mặc định), và Đều đặn (nhắc cố định).
  * Mục Giờ giấc trong ngày: Chỉnh giờ Thức dậy (07:00), Đi ngủ (01:00) và tự động khóa thông báo trong khung Giờ yên lặng (01:00 - 07:00).
  * Mục Âm báo: 3 thẻ chọn âm thanh gồm Gợn nhẹ, Violin Tinh cầu, và Chuông bong bóng (sử dụng Web Audio API tạo âm thanh ngân hà tương ứng khi bấm thử và khi nhắc).
- Tab Nhật ký ngân hà (`src/tabs/JournalTab.tsx`):
  * Tiêu đề Nhật ký ngân hà kèm nút (i), thanh chuyển tháng < >.
  * Lịch tháng từ T2 đến CN; những ngày có uống nước hiện chiếc cốc có mực nước tương ứng và dấu tích huy chương vàng nếu đạt mục tiêu.
  * Thẻ Chuỗi ngày bên dưới với icon ngọn lửa mặt cười và số ngày liên tiếp.
- Tab Thống kê (`src/tabs/StatsTab.tsx`):
  * Bộ chuyển tab Tuần / Tháng / Tùy chỉnh, nút chọn tuần < >, thẻ tóm tắt Tổng và Ngày/mục tiêu.
  * Biểu đồ cột Lượng nước mỗi ngày từ T2 đến CN có đường nét đứt mục tiêu, cột nước có bọt khí và hình Chibi Voyager nhỏ ngồi trên đỉnh cột nước.
  * Thẻ thống kê số ngày Hoàn thành và chuỗi kỷ lục ở dưới cùng.
- Tab Cá nhân (`src/tabs/ProfileTab.tsx`):
  * Thẻ Hồ sơ: Avatar Voyager, đổi tên người dùng (mặc định: Mạnh), nút tải ảnh PNG/GIF nhân vật từ máy và dòng thông báo "Tiến độ lưu trên máy này.".
  * Thẻ Chỉ số cơ thể & Thời tiết: Nhập Cân nặng (kg), Chiều cao (cm), Tuổi, Mức độ vận động, nút làm mới GPS Thời tiết và công tắc "Tự động điều chỉnh mục tiêu theo thời tiết".
  * Thẻ Bạn đồng hành (6/6) và Chủ đề không gian: Mở khóa toàn bộ 6 phiên bản Voyager và 4 chủ đề vũ trụ miễn phí, không có ổ khóa vương miện.
  * Cài đặt chung: Mục tiêu mỗi ngày, Đơn vị (L/ml), Ngôn ngữ (Tiếng Việt), nút gạt Hiệu ứng âm thanh, Widget màn hình chính, Kết nối sức khỏe, và nút Xuất dữ liệu (tải file JSON/CSV lịch sử uống nước về máy).

### R5. Đóng gói Capacitor Android & Workflow xuất APK tự động
- Cấu hình `capacitor.config.ts` với `appId: 'com.manh.voyagerhydration'`, `appName: 'Voyager Hydration'`, `webDir: 'dist'`.
- Khởi tạo thư mục Android Capacitor (`npx cap add android` hoặc `npx cap sync android`).
- Thiết lập quyền thông báo (`POST_NOTIFICATIONS`) và quyền GPS (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`) trong `AndroidManifest.xml`.
- Tạo file `.github/workflows/build-apk.yml` sử dụng Node 20 và Java 21 để tự động build React, đồng bộ Capacitor Android, và chạy `./gradlew assembleDebug` để xuất file `.apk` lên GitHub Artifacts.

## Acceptance Criteria

### Verification & Testing
- [ ] Bộ kiểm thử tự động (unit tests) cho `hydrationEngine.ts` được triển khai và vượt qua toàn bộ (`npm test`), kiểm tra đúng các công thức tính $W_{base}$, $W_{activity}$, $W_{weather}$, làm tròn 50ml/0.1L và fallback tọa độ mặc định khi GPS không khả dụng.
- [ ] Lệnh kiểm tra kiểu và build web (`npm run build`) hoàn thành thành công không có lỗi TypeScript hay cú pháp nào.
- [ ] Cấu hình Capacitor Android hợp lệ, lệnh `npx cap sync android` chạy thành công và các quyền thông báo, GPS được khai báo đầy đủ trong `android/app/src/main/AndroidManifest.xml`.
- [ ] File `.github/workflows/build-apk.yml` tồn tại, cú pháp YAML hợp lệ, cấu hình đúng môi trường Node 20, Java 21 và bước build `./gradlew assembleDebug`.
- [ ] Toàn bộ 5 tab giao diện và các thành phần UI (Card-UI viền 2px `#1E293B`, hiệu ứng bể nước, Web Audio API, các biểu cảm Chibi Voyager, xuất dữ liệu JSON/CSV) hoạt động đầy đủ trên trình duyệt mà không có lỗi console hay placeholder TODO.


## Follow-up — 2026-10-31T15:27:50Z

Cập nhật giao diện ứng dụng theo dõi uống nước "Voyager's Cosmic Hydration" tại D:\uống nước: bổ sung hình ảnh Voyager uống nước khi thêm nước, thay thế ảnh Voyager bị che bởi màn đêm lúc đi ngủ bằng hình ảnh Voyager đi ngủ hẳn, và thay thế nguồn nước tăng dần bằng một hành tinh chứa nước từ trạng thái trống nước (0%) tới khi uống đủ nước trong ngày (100%), sử dụng model Gemini 4 Argon Medium để tạo các tài nguyên hình ảnh minh họa mới.

Working directory: D:\uống nước
Integrity mode: development

References:
- Project location: D:\uống nước
- Existing character & UI components: `src/components/VoyagerChibi.tsx`, `src/components/WaveTank.tsx`, `src/tabs/TodayTab.tsx`
- Character reference: Voyager (Reverse: 1999) with sailor hat, star cape, galaxy blue hair, violin

## Requirements

### R1. Sinh và tích hợp hình ảnh nhân vật Voyager mới
- Sử dụng model Gemini 4 Argon Medium (hoặc công cụ sinh ảnh AI thích hợp) để tạo hình ảnh nhân vật Voyager mới với phong cách nghệ thuật đồng bộ với nhân vật hiện tại:
  * Hình ảnh Voyager đang uống nước một cách vui tươi/dễ thương.
  * Hình ảnh Voyager đang ngủ say/ngủ hẳn (sleeping soundly), không sử dụng lớp overlay tối màn đêm phủ lên hình ảnh cũ.
- Tích hợp hình ảnh Voyager uống nước kích hoạt khi người dùng thực hiện thao tác thêm nước (quick log hoặc custom ml).
- Tích hợp hình ảnh Voyager đi ngủ vào trạng thái đi ngủ (bedtime / quiet hours) của ứng dụng.

### R2. Thành phần Hành tinh chứa nước (Cosmic Water Planet)
- Thay thế thành phần nguồn nước / bể sóng nước tăng dần hiện tại ở màn hình chính (TodayTab) bằng một Hành tinh chứa nước trong vũ trụ.
- Tạo hình ảnh/đồ họa hành tinh nước vũ trụ:
  * Trạng thái bắt đầu ngày mới (0% lượng nước đã uống): Hành tinh ở trạng thái trống nước.
  * Khi tiến độ uống nước trong ngày tăng: Nước trong hành tinh dâng dần hoặc bao phủ tương ứng với tỷ lệ phần trăm đã uống.
  * Khi người dùng uống đủ 100% mục tiêu nước trong ngày: Hành tinh đạt trạng thái đầy đủ nước hoàn chỉnh.
- Hiển thị rõ ràng các mốc thông tin lượng nước (ml hiện tại, mục tiêu ngày, tỷ lệ phần trăm) hài hòa với hành tinh nước.

### R3. Đảm bảo toàn vẹn giao diện và kiểm thử
- Bảo toàn tính tương thích với các tab khác (ReminderTab, JournalTab, StatsTab, ProfileTab) và các chức năng cốt lõi (lưu trữ localStorage/@capacitor/preferences, streak, nhắc nhở).
- Chạy và vượt qua toàn bộ bộ kiểm thử tự động sẵn có của dự án (`npm test`).
- Ứng dụng build thành công với `npm run build` không có lỗi TypeScript hoặc lỗi cú pháp.

## Acceptance Criteria

### Visual & Interactive Behavior
- [ ] Thao tác ghi nhận thêm nước kích hoạt hiển thị hình ảnh Voyager đang uống nước trên giao diện.
- [ ] Trong khung giờ đi ngủ (bedtime / quiet hours), nhân vật Voyager hiển thị hình ảnh đang ngủ hẳn, không có lớp overlay tối màu che khuất khuôn mặt/nhân vật.
- [ ] Màn hình chính hiển thị Hành tinh chứa nước thay thế cho bể sóng nước cũ, thể hiện chính xác tiến độ từ 0% (trống nước) đến 100% (đầy đủ nước theo mục tiêu ngày).
- [ ] Các thông số lượng nước (ml đã uống, mục tiêu ngày, phần trăm hoàn thành) hiển thị đầy đủ, đồng bộ chính xác với trạng thái của hành tinh nước.

### Verification & Testing
- [ ] Lệnh kiểm thử tự động `npm test` chạy và vượt qua 100% test cases của dự án.
- [ ] Lệnh `npm run build` hoàn thành thành công không phát sinh lỗi TypeScript hay cú pháp.
- [ ] Giao diện tải và hoạt động trơn tru trên trình duyệt, không có lỗi runtime hay lỗi console.
