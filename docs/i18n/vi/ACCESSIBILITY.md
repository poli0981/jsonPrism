> **Lưu ý:** Đây là bản dịch tiếng Việt chỉ mang tính tham khảo. Nếu có
> bất kỳ khác biệt nào giữa bản dịch này và
> [bản gốc tiếng Anh](../../../ACCESSIBILITY.md), bản tiếng Anh được ưu
> tiên áp dụng.

# Trợ năng (Accessibility)

**Rà soát lần cuối**: 2026-11-09 · **Áp dụng cho**: JSONPrism 2.2.0 (website, ứng dụng desktop và Android)

JSONPrism muốn ai cần chuyển đổi JSON cũng dùng được, bất kể họ dùng
thiết bị nhập nào, trình đọc màn hình nào, thiết lập hiển thị hay ngôn
ngữ nào. Tài liệu này nêu mục tiêu, những gì đang hoạt động, cách đã kiểm
thử, những gì còn chưa ổn và cách báo một rào cản.

JSONPrism do một người duy trì (xem [DISCLAIMER.md](../../../DISCLAIMER.md)).
Đây là nỗ lực thành thật hết mức có thể, không phải kết quả được chứng nhận.

## Mục tiêu

- **Đích: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) mức AA.** Website và
  các ứng dụng dùng chung một giao diện, nên mục tiêu áp dụng cho tất cả.
  Đây là mục tiêu, không phải tuyên bố đã đạt chuẩn: chưa có đợt audit
  chính thức nào.
- **Ưu tiên, theo thứ tự:**
  1. Mọi việc đều làm được chỉ bằng bàn phím: chuyển đổi, mở và lưu tệp,
     chuyển đổi hàng loạt (batch), tuỳ chọn và màn hình đồng ý điều khoản.
  2. Mọi control đều có tên, vai trò và trạng thái để trình đọc màn hình
     đọc được, bằng ngôn ngữ của giao diện.
  3. Nội dung luôn dễ đọc khi tăng độ tương phản, phóng to, dùng theme
     sáng hoặc tối, giảm chuyển động hoặc bật contrast theme của Windows.
- **Lỗi hồi quy về trợ năng là bug.** Chúng được phân loại và sửa như mọi
  bug khác (xem [Báo lỗi trợ năng](#báo-lỗi-trợ-năng)).

## Những gì đang hoạt động

### Bàn phím

- Mọi phần tử tương tác đều là nút, liên kết hay control form gốc của
  HTML, hoặc component Radix UI có sẵn hỗ trợ bàn phím. Không phần tử nào
  có `tabindex` dương.
- **Bỏ qua, tới nội dung chính** (skip link) là điểm dừng Tab đầu tiên.
  Khi bạn chuyển sang trang khác, focus chuyển vào nội dung của trang đó.
- Control nào đang có focus cũng hiện chỉ báo focus.
- **Hộp thoại và sheet** (Tuỳ chọn, Batch, chọn định dạng):
  - focus nằm gọn bên trong khi chúng đang mở;
  - Escape đóng chúng;
  - sau đó focus quay về nút đã mở chúng.
- **Màn hình đồng ý** giữ focus bên trong và phải được trả lời; sau khi
  bạn đồng ý, focus chuyển vào nội dung trang.
- **Ô nhập (editor):** Tab dùng để thụt lề. Để rời khỏi editor, nhấn
  **Esc rồi Tab** (WCAG 2.1.2). Mô tả cho trình đọc màn hình và thanh
  trạng thái đều ghi điều này.
- Ô kết quả chỉ đọc và các vùng cuộn khác nhận được focus và cuộn bằng
  phím mũi tên, Page Up/Down.
- **Vùng kéo thả có cách tương đương bằng bàn phím:** **Mở** ở ô nhập,
  **click để duyệt…** trong Batch.

### Trình đọc màn hình

- **Cấu trúc trang:**
  - landmark (banner, điều hướng, nội dung chính, chân trang);
  - mỗi trang một `h1`;
  - tiêu đề trang đã dịch cho mọi route.
- `<html lang>` theo ngôn ngữ giao diện. Mỗi tên ngôn ngữ trong bộ chuyển
  ngôn ngữ có `lang` riêng.
- **Các editor:**
  - Cả hai đều có tên, ví dụ "JSON đầu vào" và "Kết quả CSV (chỉ đọc)".
  - Ô nhập báo nội dung có hợp lệ hay không (`aria-invalid`).
  - Ô nhập được mô tả bằng thông báo lỗi hiện tại (`aria-describedby`).
- **Live region đọc lên:**
  - lỗi phân tích kèm dòng và cột, và lỗi chuyển đổi (dạng cảnh báo);
  - trạng thái chuyển đổi, nhưng không đọc số byte hay thời gian;
  - tiến độ batch và bước xác minh con người;
  - thông báo mất mạng và trạng thái đang tải trang;
  - các thông báo (notification).
- **Trạng thái và phím tắt:**
  - Nút bật/tắt có `aria-pressed`.
  - Lựa chọn theme là radio, các thiết lập bật/tắt là switch.
  - Phím tắt tải về và mở tuỳ chọn được khai báo bằng `aria-keyshortcuts`.
- Icon trang trí được ẩn khỏi công nghệ hỗ trợ, nút chỉ có icon đều có tên.
- Các thông báo riêng của editor (tìm kiếm, thay thế, thu gọn) cùng bảng
  tìm kiếm và bảng lỗi đã được dịch sang cả bốn ngôn ngữ giao diện.

### Hiển thị

- **Theme:** sáng, tối và theo hệ thống.
  - Màu chữ đã được kiểm tra đạt 4.5:1 so với nền ở cả hai theme.
  - Chỉ báo focus dùng màu ring của theme, tương phản từ 3:1 trở lên.
- **Giảm chuyển động:** khi bật `prefers-reduced-motion`, hiệu ứng động và
  chuyển cảnh bị tắt, nút Về đầu trang nhảy thẳng thay vì cuộn mượt.
- **Contrast theme của Windows** (`forced-colors`): focus, nút đang được
  chọn và switch được vẽ bằng màu hệ thống.
- **Không truyền tải ý nghĩa chỉ bằng màu:**
  - chấm trạng thái luôn đi kèm chữ;
  - các dòng trong batch có icon và chữ;
  - chấm báo có kết quả mới trên tab Kết quả (bố cục hẹp) còn kèm chữ "(mới)".
- **Vùng chạm** đạt WCAG 2.5.8: tối thiểu 24 × 24 CSS px, hoặc cách nhau
  đủ để vòng tròn 24 px quanh mỗi vùng không chồng lên vùng bên cạnh.

### Phóng to và dàn lại bố cục

- **Website:** phóng to của trình duyệt và tăng cỡ chữ đều dùng được,
  không bao giờ chặn pinch-zoom.
- **Ứng dụng desktop:** từ 2.2.0, Ctrl/⌘ + = và Ctrl/⌘ + − phóng to, thu
  nhỏ cửa sổ. Trên Windows dùng được cả Ctrl + con lăn chuột.
- **Màn hình hẹp:** bố cục dàn lại tới bề rộng 320 CSS px mà không cần
  cuộn ngang. Bố cục được thiết kế cho 360 × 640 trở lên
  ([các viewport đã kiểm thử](../../tested-viewports.md)).

### Ngôn ngữ

Giao diện, kể cả mọi đoạn chữ dành cho trình đọc màn hình, có tiếng Anh,
tiếng Việt, tiếng Nhật và tiếng Trung giản thể.

## Bảng phím tắt

| Phím | Ở đâu | Tác dụng |
| --- | --- | --- |
| Tab / Shift+Tab | Mọi nơi | Control tiếp theo / trước đó |
| Enter trên **Bỏ qua, tới nội dung chính** | Lần Tab đầu tiên của trang | Nhảy tới nội dung trang |
| Ctrl+S (⌘S trên macOS) | Trang chuyển đổi | Tải kết quả về |
| Ctrl+, (⌘, trên macOS) | Trang chuyển đổi | Mở Tuỳ chọn |
| Esc | Hộp thoại, sheet, menu Giao diện | Đóng, focus quay về nút đã mở |
| ↑ ↓ Home End | Menu Giao diện | Di chuyển giữa các mục |
| ← → | Tab Đầu vào / Kết quả (màn hình hẹp) | Chuyển tab |
| Esc rồi Tab | Ô nhập | Rời editor (chỉ Tab thì thụt lề) |
| Ctrl+M (Shift+Alt+M trên macOS) | Ô nhập | Bật/tắt chế độ "Tab chuyển focus" |
| Ctrl+] / Ctrl+[ (⌘] / ⌘[) | Ô nhập | Thụt lề / bỏ thụt lề |
| Ctrl+F (⌘F), rồi F3 / Shift+F3 | Cả hai editor | Tìm, kết quả tiếp / trước |
| Ctrl+Alt+G (⌘⌥G) | Cả hai editor | Đến dòng |
| Ctrl+Shift+M (⌘⇧M), F8 | Ô nhập | Mở danh sách lỗi, lỗi tiếp theo |
| Alt+T | Mọi nơi | Focus vào thông báo (tạm dừng chúng) |
| Ctrl/⌘ + = và − | Ứng dụng desktop | Phóng to / thu nhỏ |

## Cách kiểm thử

### Đã kiểm thử với

| Ngày | Phiên bản | Nền tảng | Cách kiểm | Kết quả |
| --- | --- | --- | --- | --- |
| 2026-11 | 2.1.1 | Windows 11: website trên Edge, Brave và Firefox; ứng dụng Windows (WebView2) | Narrator; chỉ bàn phím, không dùng chuột (maintainer) | Không có lỗi chặn |
| 2026-11-09 | 2.2.0 | Chromium (bản development) | Đi bằng bàn phím qua các thay đổi của 2.2.0: skip link, focus sau khi chuyển trang và sau màn hình đồng ý, chỉ báo focus | Đạt |
| 2026-11-09 | 2.2.0 | iPhone 14 Pro (máy thật), iOS 26: website production trên Brave và Chrome | Kiểm tra thủ công bằng cảm ứng (maintainer) | Hoạt động đúng |
| Mỗi pull request | — | jsdom trong CI | [axe-core](https://github.com/dequelabs/axe-core) trên mọi trang, màn hình đồng ý và từng sheet; kiểm tra vai trò và tên bằng Testing Library | Bắt buộc đạt |
| 2026-10-22 | 2.0.0 | Giả lập thiết bị trên Chromium, từ 360 × 740 tới 1280 × 800, sáng và tối | Kiểm tra bố cục bằng mắt | Xem [các viewport đã kiểm thử](../../tested-viewports.md) |

Bài quét tự động chạy không có engine layout thật nên không đo được độ
tương phản màu; độ tương phản được kiểm tra thủ công.

**Chưa kiểm thử** (rất mong nhận báo cáo):

- **Trình đọc màn hình:** NVDA và JAWS (Windows), VoiceOver (macOS, iOS),
  TalkBack (Android), Orca (Linux).
- **Điều khiển bằng giọng nói:** Dragon, Voice Access.
- **Trên thiết bị thật:** contrast theme của Windows, cỡ chữ hệ thống trên
  Android.

### Kiểm tra thủ công trước khi phát hành

1. **Chỉ bàn phím.** Đi qua mọi luồng chính:
   - chuyển đổi, mở tệp, tải về;
   - chạy một batch ra tệp `.zip`;
   - đổi tuỳ chọn, theme và ngôn ngữ;
   - qua màn hình đồng ý.

   Kiểm tra focus luôn nhìn thấy và không bao giờ bị kẹt.
2. **Trình đọc màn hình.** Dùng Narrator, NVDA hoặc VoiceOver cho các
   luồng trên. Nghe tên, trạng thái, lỗi và trạng thái chuyển đổi.
3. **Phóng to.** Kiểm tra ở 200 % và 400 % trong cửa sổ rộng 1280 px, cùng
   chế độ chỉ phóng to chữ nếu trình duyệt có.
4. **Thiết lập hiển thị.** Kiểm tra với contrast theme của Windows, với
   giảm chuyển động, và ở theme sáng lẫn tối.
5. **Quét tự động.** Chạy `npm test`, lệnh này bao gồm bài quét axe-core.

## Môi trường hỗ trợ

| Bề mặt | Engine | Công nghệ hỗ trợ đã kiểm |
| --- | --- | --- |
| Website | Chrome, Edge, Brave, Firefox và Safari bản hiện hành (engine tối thiểu: Chromium 111, WebKit của macOS 12) | Narrator với Edge, Brave và Firefox |
| Ứng dụng Windows | Microsoft Edge WebView2 | Narrator |
| Ứng dụng macOS (12+) | WKWebView | — |
| Ứng dụng Linux (Ubuntu 22.04+) | WebKitGTK | — |
| Ứng dụng Android (12+) | Android System WebView, Chromium 111+ | — |

## Hạn chế đã biết

Đây là các rào cản đã biết, kèm cách khắc phục tạm nếu có. Chúng được
theo dõi trong [`docs/ROADMAP.md`](../../ROADMAP.md).

1. **Kết quả dài khi trình đọc màn hình ở chế độ duyệt (browse mode).**
   Editor chỉ giữ trong trang các dòng đang hiển thị, nên con trỏ ảo không
   đọc được hết một kết quả dài. *Cách khắc phục:* **Sao chép** hoặc **Tải
   về** kết quả rồi đọc bằng ứng dụng khác.
2. **Tab thụt lề trong ô nhập.** *Cách khắc phục:* nhấn Esc rồi Tab; hoặc
   nhấn Ctrl+M (Shift+Alt+M trên macOS) để Tab chuyển focus.
3. **Cửa sổ nhỏ hoặc thấp.**
   - Khi chiều cao dưới khoảng 600 CSS px, các editor trở nên rất thấp,
     kể cả khi phóng to 400 % trong cửa sổ rộng 1280 px.
   - Trên điện thoại, chỉ chiều dọc được hỗ trợ đầy đủ.
   - Khi bề rộng vượt qua mốc 768 CSS px, ví dụ do phóng to, bố cục chuyển
     giữa dạng hai cột và dạng tab. Các editor được tạo lại: chữ của bạn
     vẫn còn, nhưng focus và lịch sử hoàn tác (undo) thì không.

   *Cách khắc phục:* phóng to ở mức 200–300 %.
4. **Xác minh con người (chỉ trên website).** Cloudflare Turnstile chạy
   trong một khung của Cloudflare, nên khả năng truy cập của nó thuộc về
   Cloudflare. Nếu bước này lỗi hoặc quá 20 giây, nút **Tiếp tục không xác
   minh** sẽ hiện ra.
5. **Thông báo tự đóng sau 4 giây.** Trình đọc màn hình đọc chúng ngay khi
   xuất hiện. *Cách khắc phục:* rê chuột lên, hoặc nhấn Alt+T để focus và
   tạm dừng chúng.
6. **Tương phản phi văn bản thấp.** Viền ô nhập và switch dưới 3:1
   (WCAG 1.4.11). Ô nào cũng có nhãn, nhưng đường viền mờ.
7. **Định dạng không dùng được.** Lý do một định dạng không dùng được nằm
   trong tooltip. Trình đọc màn hình nhận được nó dưới dạng mô tả của nút,
   nhưng người dùng màn hình cảm ứng không xem được.
8. **Không báo khi mở tab mới.** Các liên kết mở tab mới, hoặc mở trình
   duyệt hệ thống từ ứng dụng, không nói điều đó.
9. **Ứng dụng desktop.** Cửa sổ nhỏ nhất là 800 × 560. Phóng to trang mới
   có từ 2.2.0.
10. **Ứng dụng Android.** Ứng dụng dùng cách xử lý mặc định của WebView
    với cỡ chữ hệ thống và pinch-zoom, chưa được kiểm chứng trên thiết bị
    thật.
11. **Bản dịch.** Chữ tiếng Nhật và tiếng Trung, kể cả chữ dành cho trình
    đọc màn hình, do AI tạo; rất hoan nghênh người bản ngữ sửa.

## Yêu cầu với người đóng góp

Người đóng góp kiểm tra các điểm sau với mọi thay đổi giao diện (xem thêm
[CONTRIBUTING.md](../../../CONTRIBUTING.md)):

- **Phần tử.** Dùng phần tử HTML gốc hoặc các component trong
  `src/components/ui/`. Không gắn click handler cho `div` hay `span`, không
  dùng `tabindex` dương.
- **Tên.** Mọi control đều có tên accessible lấy từ các file locale, đủ cả
  bốn ngôn ngữ. Nút chỉ có icon có `aria-label`, icon trang trí có
  `aria-hidden`.
- **Focus.**
  - Không dùng `outline-none` nếu không có thứ thay thế dạng `focus-visible:`.
  - Vùng cuộn nhận focus phải có `role="region"` và nhãn.
  - Ngoại lệ duy nhất là phần tử được focus từ code với `tabIndex={-1}`,
    như `<main>`.
- **Chuyển động và màu.** Hiệu ứng động đặt sau `motion-safe:`. Không
  truyền tải ý nghĩa chỉ bằng màu.
- **Thông báo.** Dùng các live region có sẵn, giữ thông báo ngắn gọn.
  Không đọc lên đoạn chữ thay đổi sau mỗi lần gõ phím.
- **Kiểm thử.**
  - `npm test` phải đạt, kể cả bài quét axe-core trong
    `src/app/__tests__/a11y.test.tsx`. Mở rộng bài quét khi thêm trang hay
    hộp thoại mới.
  - Tự đi bằng bàn phím qua phần mình thay đổi và ghi lại trong pull request.
  - Kiểm tra nhanh bằng trình đọc màn hình thì càng tốt.
- **Tài liệu này.** Cập nhật khi hành vi hoặc một hạn chế đã biết thay đổi.

## Báo lỗi trợ năng

Mở issue bằng template **[Accessibility
issue](https://github.com/poli0981/jsonPrism/issues/new?template=accessibility.md)**,
kèm theo:

- bạn định làm gì và chuyện gì đã xảy ra;
- công nghệ hỗ trợ bạn dùng và phiên bản;
- phiên bản trình duyệt hoặc ứng dụng, và hệ điều hành.

Bạn không cần biết nguyên nhân.

Nếu không thể hoặc không muốn dùng GitHub, hãy email
**code@poli0981.dev**, tiêu đề có chữ "Accessibility". Vấn đề bảo mật đi
theo [SECURITY.md](../../../SECURITY.md).

### Mức độ

| Mức độ | Ý nghĩa | Ví dụ |
| --- | --- | --- |
| Critical | Chặn một việc chính, không có cách khắc phục | Không thể chuyển đổi, mở, lưu tệp hoặc qua màn hình đồng ý bằng bàn phím hay trình đọc màn hình |
| High | Rất khó khăn nhưng có cách khắc phục | Lỗi không bao giờ được đọc lên, nhưng có hiện trong ô kết quả |
| Medium | Không nhất quán hoặc gây khó hiểu, nhưng vẫn làm được | Nhãn sai hoặc thiếu; focus rơi vào chỗ lạ |
| Low | Phiền nhỏ | Đọc lên quá dài dòng; một gợi ý chưa được dịch |

### Cách chúng tôi phản hồi

- Cảm ơn bạn và hỏi lại nếu có gì chưa rõ. Không bao giờ yêu cầu bạn giải
  thích vì sao bạn cần một tính năng trợ năng.
- Gắn nhãn `accessibility`, đặt mức độ, ưu tiên lỗi chặn trước lỗi về
  hình thức.
- Chia sẻ cách khắc phục tạm ngay khi biết.
- Khi có bản sửa, nhờ bạn xác nhận nếu bạn sẵn lòng. Các bản sửa được ghi
  trong [CHANGELOG.md](../../../CHANGELOG.md).

### Thời gian phản hồi

Đây là nỗ lực hết mức có thể của một dự án một người:

| Mức độ | Phản hồi đầu tiên | Phát hành bản sửa |
| --- | --- | --- |
| Critical | trong vòng 7 ngày | bản patch kế tiếp |
| High | trong vòng 14 ngày | bản phát hành kế tiếp |
| Medium / Low | trong vòng 30 ngày | khi có thể, thường là bản minor kế tiếp |

## Trách nhiệm và duy trì

Kokone ([@poli0981](https://github.com/poli0981)), maintainer duy nhất
(xem [MAINTAINERS.md](../../../MAINTAINERS.md)), chịu trách nhiệm về trợ
năng, gồm:

- phân loại báo cáo;
- theo dõi chúng bằng nhãn `accessibility`;
- chạy [bước kiểm tra thủ công](#kiểm-tra-thủ-công-trước-khi-phát-hành)
  trước khi phát hành;
- giữ tài liệu này luôn cập nhật, kể cả ngày rà soát.

## Góp ý

Mọi góp ý cho tài liệu này đều được hoan nghênh qua issue hoặc pull request.

Cấu trúc tài liệu theo khuyến nghị của Open Source Guides
([Accessibility best practices for your
project](https://opensource.guide/accessibility-best-practices-for-your-project/))
và [Open Source Accessibility
toolkit](https://github.com/open-source-accessibility/accessibility-toolkit).

[English](../../../ACCESSIBILITY.md)
