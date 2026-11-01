Nâng cấp giao diện nhân vật Voyager (thêm hình ảnh uống nước khi người dùng thêm nước, thay ảnh đi ngủ bằng hình ảnh ngủ thật sự không dùng overlay màn đêm), thay thế nguồn nước bằng Hành tinh chứa nước (Water Planet) hiển thị tiến độ từ 0% đến 100%, và khắc phục lỗi thông báo không phát được trên Android kèm kịch bản kiểm thử mô phỏng hệ thống Android trước khi đóng gói cho ứng dụng "Voyager's Cosmic Hydration" tại D:\uống nước cho mục đích [OPEN: Mục đích chính của đợt cập nhật (production update cho sử dụng thực tế hay exploration)?].

Working directory: D:\uống nước
Integrity mode: development [OPEN: Giới hạn những điều nhóm không được làm (Integrity Mode)?]

References:
- Project repository & location: D:\uống nước (https://github.com/manhaaaa/voyager-hydration.git)
- Existing components & assets: `src/components/VoyagerChibi.tsx`, `src/components/WaveTank.tsx`, `src/tabs/TodayTab.tsx`, `src/tabs/ReminderTab.tsx`, `src/utils/notificationEngine.ts`, `android/app/src/main/AndroidManifest.xml`, `capacitor.config.ts`
- Character reference: Voyager (Reverse: 1999) with sailor hat, star cape, galaxy blue hair, violin (`C:/Users/manha/.gemini/antigravity/brain/f2a2ac03-84b6-43e0-ae8e-3472cba79c9a/.user_uploaded/media_1793371487089_cd42a7d2.png` and `d:\uống nước\public\assets\character\`)

## Requirements

### R1. Tích hợp hình ảnh nhân vật Voyager mới (Uống nước & Đi ngủ)
- Tạo và tích hợp hình ảnh Voyager đang uống nước kích hoạt khi người dùng thêm nước vào ứng dụng.
- Tạo và tích hợp hình ảnh Voyager đi ngủ thực sự trong khung giờ bedtime/quiet hours, loại bỏ hoàn toàn lớp phủ tối màn đêm (SleepingOverlay) che mờ nhân vật.
- [OPEN: Phương thức tạo hình ảnh Voyager mới?]

### R2. Hành tinh chứa nước vũ trụ (Cosmic Water Planet)
- Thay thế thành phần nguồn nước/bể sóng cũ tại màn hình chính (TodayTab) bằng một Hành tinh chứa nước hình cầu vũ trụ.
- Trạng thái bắt đầu ngày (0% lượng nước đã uống) là hành tinh trống nước.
- Khi người dùng uống nước trong ngày, mực nước dâng dần bên trong hành tinh và đạt trạng thái đầy đủ nước rực rỡ khi đạt 100% mục tiêu ngày.
- [OPEN: Phong cách đồ họa hiển thị cho Hành tinh chứa nước (2D SVG/Canvas động hay 3D Three.js)?]

### R3. Khắc phục lỗi thông báo chạy ngầm trên Android và Kiểm thử mô phỏng hệ thống
- Khắc phục triệt để lỗi không phát thông báo nhắc nhở uống nước trên Android thực tế, cấu hình đầy đủ quyền chạy ngầm, exact alarm, boot receiver, foreground service và kênh thông báo ưu tiên cao (`importance: 5`, `allowWhileIdle: true`).
- Xây dựng bộ kiểm thử mô phỏng hệ thống Android (Android Notification & AlarmManager System Simulation Test) để xác minh tự động việc tạo notification channel, cấp quyền, lên lịch chạy ngầm và kích hoạt thông báo thành công.
- [OPEN: Tài nguyên hoặc kịch bản kiểm thử mô phỏng Android có sẵn từ người dùng?]

### R4. Đóng gói và phát hành bản cập nhật
- Sau khi kịch bản mô phỏng kiểm thử xác nhận thông báo hoạt động chính xác và toàn bộ bài test vượt qua, commit và đẩy lên nhánh `main` để kích hoạt workflow đóng gói APK cập nhật mới nhất.

## Acceptance Criteria

### Visual & Interactive UI
- [ ] Thao tác bấm thêm nước (quick log hoặc custom amount) kích hoạt hiển thị hình ảnh Voyager đang uống nước trên giao diện.
- [ ] Trong khung giờ đi ngủ (bedtime), nhân vật Voyager hiển thị hình ảnh đang ngủ say, không có lớp overlay tối màu che khuất nhân vật.
- [ ] Màn hình chính hiển thị Hành tinh chứa nước thay thế hoàn toàn bể nước cũ, thể hiện mực nước dâng từ 0% (trống nước) đến 100% (đầy nước hoàn chỉnh) khớp với tiến độ trong ngày.
- [ ] Các thông số lượng nước (ml hiện tại, mục tiêu, phần trăm) hiển thị đồng bộ và chính xác.

### Android Notifications & Background Execution
- [ ] Cấu hình AndroidManifest.xml và capacitor.config.ts có đầy đủ các quyền cần thiết: `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`, `POST_NOTIFICATIONS`.
- [ ] Notification Channel được khởi tạo với độ ưu tiên cao (`importance: 5`), hỗ trợ phát thông báo khi thiết bị idle (`allowWhileIdle: true`).
- [ ] Có nút bấm thử nghiệm phát thông báo ngay lập tức trên giao diện ReminderTab để người dùng kiểm tra nhanh.

### Verification & Automated Testing
- [ ] Bộ kiểm thử mô phỏng hệ thống Android Notification & AlarmManager chạy độc lập và vượt qua 100% bài kiểm tra xác nhận thông báo được lên lịch và phát thành công.
- [ ] Lệnh `npm test` và `npm run build` chạy thành công không có lỗi TypeScript hoặc cú pháp.
- [ ] Thay đổi được commit và đẩy lên repository để kích hoạt build bản cập nhật APK mới nhất.
