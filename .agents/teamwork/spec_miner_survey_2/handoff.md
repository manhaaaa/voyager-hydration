# Handoff Report — Spec Miner Survey 2: Hydration, Audio & Storage Engines

**Agent**: `teamwork_spec_miner` (`spec_miner_survey_2`)  
**Target Recipient**: Orchestrator (`7c380586-cf2a-4df7-b89c-a4b667536d21`)  
**Date**: 2026-10-30T15:06:00Z  
**Type**: Hard Handoff (Complete Specification Survey)

---

### 1. Observation

- **Authoritative Requirements Document**: `d:\uống nước\.agents\teamwork\ORIGINAL_REQUEST.md`
  - Lines 22–30 (R2):
    > "- Gọi API thời tiết miễn phí Open-Meteo (https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code) dựa trên GPS thiết bị. Nếu người dùng tắt GPS hoặc từ chối cấp quyền, mặc định lấy tọa độ Hà Nội/Vinh."
    > "- Công thức tính mục tiêu nước hằng ngày ($W_{total}$):"
    > "  * Nước cơ bản: $W_{base} = \text{Cân nặng (kg)} \times 35\text{ (ml)}$."
    > "  * Mức vận động ($W_{activity}$): Ít vận động ($+0\text{ ml}$), Vừa ($+350\text{ ml}$), Cao ($+700\text{ ml}$)."
    > "  * Phụ thu thời tiết ($W_{weather}$): Cộng $+250\text{ ml}$ nếu nhiệt độ $28^\circ\text{C} - 32^\circ\text{C}$; cộng $+500\text{ ml}$ nếu $> 32^\circ\text{C}$; cộng thêm $+150\text{ ml}$ nếu độ ẩm $< 40\%$."
    > "  * Tổng: $W_{total} = W_{base} + W_{activity} + W_{weather}$ (làm tròn đến $50\text{ ml}$ hoặc $0,1\text{ L}$)."
    > "- Lưu trữ offline: Lưu toàn bộ state vào localStorage và @capacitor/preferences để bảo toàn dữ liệu khi đóng ứng dụng."
  - Lines 43–47 (R4 Reminder Tab):
    > "- Thẻ Nhắc lần tới: Chibi Voyager cầm chuông ngân hà, đồng hồ đếm ngược tới lần nhắc kế tiếp và nút gạt bật/tắt Nhắc uống nước kết nối trực tiếp với @capacitor/local-notifications."
    > "- Mục Cách nhắc: 3 thẻ chọn viền đậm gồm Nhẹ nhàng (thưa), Thông minh (tự tính theo lượng nước còn thiếu - mặc định), và Đều đặn (nhắc cố định)."
    > "- Mục Giờ giấc trong ngày: Chỉnh giờ Thức dậy (07:00), Đi ngủ (01:00) và tự động khóa thông báo trong khung Giờ yên lặng (01:00 - 07:00)."
    > "- Mục Âm báo: 3 thẻ chọn âm thanh gồm Gợn nhẹ, Violin Tinh cầu, và Chuông bong bóng (sử dụng Web Audio API tạo âm thanh ngân hà tương ứng khi bấm thử và khi nhắc)."
- **Live Open-Meteo API Verification**:
  - Live probe using `read_url_content` on `https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,relative_humidity_2m,weather_code`:
    Output returned HTTP 200 with JSON payload:
    `{"latitude":21.05448,"longitude":105.898476,"current":{"time":"2026-10-30T15:00","temperature_2m":25.4,"relative_humidity_2m":90,"weather_code":1}}`
  - Verifies exact field names: `current.temperature_2m`, `current.relative_humidity_2m`, and `current.weather_code`.

---

### 2. Logic Chain

1. **Hydration Engine**:
   - From R2, $W_{total} = W_{base} + W_{activity} + W_{weather}$.
   - For $W_{base}$, standard multiplication of sanitized weight $\times 35$ ml guarantees baseline physiological requirement ($60\text{ kg} \to 2100\text{ ml}$).
   - Activity tiers map directly to $0$, $350$, and $700$ ml.
   - For $W_{weather}$, the rules are strictly cumulative: temperature delta ($\Delta W_{temp} \in \{0, 250, 500\}$) plus humidity delta ($\Delta W_{humid} \in \{0, 150\}$). A condition of $35^\circ\text{C}$ and $35\%$ humidity yields $+500 + 150 = +650\text{ ml}$.
   - Rounding to the nearest $50\text{ ml}$ via `Math.round(total / 50) * 50` creates clean steps compatible with 0.1L increments and standard container sizes.
   - Primary fallback coordinates for Hanoi are `21.0285, 105.8542` and secondary for Vinh are `18.6734, 105.6813`.
2. **Web Audio Procedural Synthesis Engine**:
   - To eliminate 100% of network failures, storage bloat, or asset loading issues on Android WebViews, all 3 soundscapes are synthesized using native Web Audio API oscillators and filters:
     - "Gợn nhẹ": Frequency sweep sine drop (450Hz to 1350Hz) + resonant 330Hz tail + 2200Hz lowpass filter.
     - "Violin Tinh cầu": Multi-oscillator cluster (Sawtooth + detuned Triangle + octave) + 5.6Hz vibrato LFO with envelope delay + 1850Hz body resonance filter + 140ms cosmic delay echo.
     - "Chuông bong bóng": FM crystalline ping (Carrier 1046.5Hz modulated by 2093Hz sine with exponential modulation depth decay) + bubble pitch chirp (780Hz -> 1046Hz) + high shimmer sparkle.
   - AudioContext requires gesture unlocking (`resume()`) on touch to comply with mobile autoplay policies.
3. **Dual-Layer Persistence & Notification Scheduling**:
   - `localStorage` provides 0ms synchronous load for React components on mount, preventing layout shifts.
   - `@capacitor/preferences` provides asynchronous native `SharedPreferences` persistence resilient against Android WebView cleanup.
   - Smart mode notification interval is computed dynamically: $\Delta T_{awake} / \lceil \text{Deficit} / 250 \rceil$, clamped between 45 min and 150 min.
   - Quiet hours (01:00 - 07:00) strictly suppress or postpone any scheduled notification to 07:00 AM.

---

### 3. Caveats

- Android 13+ devices require explicit runtime granting of the `POST_NOTIFICATIONS` permission before local notifications can display. The implementation must call `LocalNotifications.requestPermissions()`.
- Android battery optimization (Doze mode) can delay inexact alarms by a few minutes on some device vendor skins (MIUI/ColorOS), but Capacitor's local notification plugin uses AlarmManager / exact alarms where supported.
- Open-Meteo free API has generous rate limits (10,000 requests/day), but local caching with a 30-minute TTL is specified to maximize battery life and ensure offline operability.

---

### 4. Conclusion

All mathematical models, procedural audio node graphs, data schemas, notification scheduling equations, and unit test specifications have been fully established and documented in `d:\uống nước\.agents\teamwork\spec_miner_survey_2\spec_report.md`. No ambiguities remain for the implementation workers.

---

### 5. Verification Method

To verify these specifications:
1. Inspect the detailed technical report:
   `view_file` on `d:\uống nước\.agents\teamwork\spec_miner_survey_2\spec_report.md`.
2. Verify Open-Meteo API contract:
   `curl "https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,relative_humidity_2m,weather_code"`.
3. Invalidation Conditions:
   - If user requirements alter base water intake formula away from $35\text{ ml/kg}$.
   - If native audio files (`.mp3` or `.wav`) are requested instead of procedural Web Audio API synthesis.
