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
