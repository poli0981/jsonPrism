> **Lưu ý:** Đây là bản dịch tiếng Việt chỉ mang tính tham khảo. Nếu có
> bất kỳ khác biệt nào giữa bản dịch này và
> [bản gốc tiếng Anh](../../../PRIVACY.md), bản tiếng Anh được ưu tiên
> áp dụng.

# Chính sách quyền riêng tư

**Phiên bản**: 2.0 · **Ngày hiệu lực**: 2026-10-22 · Thay thế chính sách ngày 2026-05-13.

## Tóm tắt

- **Dữ liệu của bạn ở lại trên thiết bị của bạn.** JSON, tệp và kết quả
  đầu ra đều được chuyển đổi trong trình duyệt của bạn hoặc trong ứng dụng
  desktop/Android. Chúng không bao giờ được tải lên, và JSONPrism không có
  hệ thống tài khoản, không có đồng bộ đám mây và không có cơ chế báo cáo
  lỗi (error reporting).
- **Trang web** (<https://jsonprism.poli0981.dev>) được lưu trữ trên
  Cloudflare. Trang web chạy một bước xác minh nhanh rằng bạn là con người
  (human check) bằng Cloudflare Turnstile khi bạn mở trang lần đầu (và lặp
  lại sau mỗi 7 ngày), đồng thời đếm lượt xem trang bằng Cloudflare Web
  Analytics, một dịch vụ không sử dụng cookie. Bạn có thể tắt tính năng
  thống kê trong mục **Giao diện** (Appearance); tính năng này ban đầu ở
  trạng thái tắt nếu trình duyệt của bạn gửi tín hiệu
  [Global Privacy Control](https://globalprivacycontrol.org/).
- **Các ứng dụng desktop và Android** không tự thực hiện bất kỳ yêu cầu
  mạng nào và không sử dụng bất kỳ dịch vụ Cloudflare nào nói trên.

## Bên chịu trách nhiệm

JSONPrism là một dự án mã nguồn mở do một cá nhân duy trì, poli0981
(Kokone), người đồng thời là bên kiểm soát dữ liệu (controller) đối với
các hoạt động xử lý được mô tả tại đây. Câu hỏi và yêu cầu về quyền riêng
tư: **privacy@poli0981.dev**.

## Những gì diễn ra trên từng nền tảng

| Nền tảng | Lưu trữ (hosting) / môi trường chạy | Những gì rời khỏi thiết bị của bạn |
|---|---|---|
| Trang web | Cloudflare Workers (tệp tĩnh cùng một API nhỏ cho bước xác minh con người) | Dữ liệu yêu cầu HTTP tiêu chuẩn cần thiết để cung cấp trang web; bước xác minh Turnstile; số liệu lượt xem trang ẩn danh nếu tính năng thống kê đang bật. Không bao giờ bao gồm dữ liệu bạn chuyển đổi. |
| Ứng dụng Windows, macOS, Linux | Tauri 2, chạy cục bộ | Không có gì được gửi đi từ mã của ứng dụng. Các liên kết bạn nhấp vào sẽ mở trong trình duyệt của bạn. |
| Ứng dụng Android | Tauri 2 trong WebView của hệ thống | Không có gì được gửi đi từ mã của ứng dụng. Các liên kết bạn chạm vào sẽ mở trong trình duyệt của bạn. |

### Dịch vụ lưu trữ (trang web)

Cloudflare, Inc. phục vụ trang web và xử lý dữ liệu mà mọi yêu cầu web
đều mang theo (địa chỉ IP, user agent, URL được yêu cầu, thời gian, thông
tin TLS) để cung cấp các trang và bảo vệ dịch vụ trước hành vi lạm dụng.
Phần mã phía máy chủ của riêng JSONPrism chỉ xử lý API xác minh con người
(`/api/turnstile/verify`) và một điểm kiểm tra tình trạng hoạt động
(health check). Với API đó, phần mã này ghi lại các sự kiện có cấu trúc —
kết quả, trạng thái HTTP, mã trung tâm dữ liệu của Cloudflare, thời lượng
và mã lỗi Turnstile — vào Cloudflare Workers Logs, được lưu giữ trong 7
ngày. Các sự kiện này không bao giờ chứa địa chỉ IP, token Turnstile hay
bất cứ nội dung nào bạn chuyển đổi. API này được Cloudflare giới hạn tần
suất truy cập (rate limit) theo từng máy khách; JSONPrism không lưu trữ
khoá máy khách (client key).

### Xác minh con người (trang web)

[Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/)
phân biệt con người với bot mà không cần giải câu đố. Khi bước xác minh
chạy, trình duyệt của bạn tải script của Cloudflare từ
`challenges.cloudflare.com`; script này thu thập các tín hiệu như địa chỉ
IP, dấu vân tay TLS (TLS fingerprint), user agent của bạn và khoá trang
(site key), như được mô tả trong
[Phụ lục quyền riêng tư của Turnstile](https://www.cloudflare.com/turnstile-privacy-policy/)
(Turnstile Privacy Addendum) của Cloudflare. Sau đó, máy chủ của JSONPrism
gửi token dùng một lần thu được — chứ không phải địa chỉ IP của bạn — tới
API xác minh của Cloudflare. Nếu vượt qua bước xác minh, trình duyệt của
bạn sẽ lưu thời điểm hết hạn (`jsonprism.humanCheck`) và không bị yêu cầu
xác minh lại trong 7 ngày.

### Web Analytics (trang web, tuỳ chọn)

[Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/)
đếm lượt xem trang và đo hiệu năng tải trang (đường dẫn trang, referrer,
loại trình duyệt và thiết bị, các chỉ số thời gian). Dịch vụ này không đặt
cookie, không sử dụng bộ nhớ cục bộ (local storage) và, theo Cloudflare,
không thu thập hay sử dụng dữ liệu cá nhân của khách truy cập. JSONPrism
chỉ tải dịch vụ này trên trang web chính thức (production), chỉ sau khi
bạn đã chấp nhận các điều khoản, và chỉ khi tuỳ chọn
**Giao diện → Thống kê truy cập ẩn danh** (Appearance → Anonymous usage
analytics) đang bật. Tuỳ chọn này ban đầu ở trạng thái tắt khi trình duyệt
của bạn gửi tín hiệu Global Privacy Control, và việc tắt tuỳ chọn có hiệu
lực từ lần truy cập tiếp theo của bạn.

### Ứng dụng desktop và Android

- Không thu thập dữ liệu từ xa (telemetry), không thống kê, không
  Turnstile, không kiểm tra bản cập nhật.
- Tệp chỉ đến được ứng dụng khi bạn chọn chúng trong hộp thoại của hệ thống
  hoặc thả chúng vào cửa sổ ứng dụng. Ứng dụng có thể đọc các tệp bạn chọn
  và chỉ ghi vào nơi bạn chọn để lưu; quyền truy cập tệp được cấp sẵn
  (static file access) của ứng dụng chỉ giới hạn trong các thư mục
  Documents, Downloads và Desktop của bạn và không bao giờ bao gồm các tệp
  ẩn như `~/.ssh`
  (xem [`src-tauri/capabilities/default.json`](../../../src-tauri/capabilities/default.json)).
- Ứng dụng Android khai báo quyền `INTERNET` vì môi trường chạy WebView của
  Tauri yêu cầu quyền này; mã của JSONPrism không thực hiện yêu cầu mạng
  nào. Tính năng sao lưu Android đối với dữ liệu của ứng dụng đã bị tắt.

## Những gì được lưu trên thiết bị của bạn

Ứng dụng lưu các mục sau trong `localStorage` của trình duyệt (hoặc của
WebView trong ứng dụng). Chúng không bao giờ rời khỏi thiết bị của bạn.

| Khoá | Nội dung |
|---|---|
| `jsonprism.consent` | Việc bạn đã chấp nhận Giấy phép, Điều khoản, Chính sách quyền riêng tư và Tuyên bố miễn trừ trách nhiệm: cờ đánh dấu, phiên bản chính sách, thời điểm |
| `jsonprism.humanCheck` | Chỉ trên trang web: thời điểm hết hạn của lần xác minh con người đã vượt qua |
| `jsonprism.prefs` | Tuỳ chọn trong mục Giao diện: ẩn thanh cuộn, bật/tắt thống kê ẩn danh |
| `jsonprism.theme` | `light`, `dark` hoặc `system` |
| `jsonprism.lang` | Ngôn ngữ giao diện (`en`, `vi`, `ja`, `zh-CN`) |
| `jsonprism.selected_format` | Định dạng đích mà bạn chọn gần nhất |
| `jsonprism.direction` | Chiều chuyển đổi |
| `jsonprism.options.<format>` | Các tuỳ chọn của bạn cho từng định dạng |

`sessionStorage` tạm thời lưu `jsonprism.preloadReload` (thời điểm ứng dụng
tự tải lại gần nhất sau khi có bản phát hành mới). Việc xoá dữ liệu của
trang web, hoặc gỡ cài đặt ứng dụng, sẽ xoá toàn bộ các dữ liệu này.

Ứng dụng cũng giữ 200 dòng nhật ký (log) gần nhất trong bộ nhớ, phục vụ
cho **Giới thiệu → Sao chép thông tin chẩn đoán** (About → Copy
diagnostics). Các dòng này không bao giờ được gửi đi bất cứ đâu; nút này
sao chép chúng vào bộ nhớ tạm (clipboard) của bạn, cùng với phiên bản,
commit và nền tảng, để bạn có thể tự quyết định có dán chúng vào báo cáo
lỗi hay không.

## Những điều JSONPrism không bao giờ làm

- Tải lên, lưu trữ hoặc xem xét nội dung bạn chuyển đổi.
- Sử dụng cookie, quảng cáo hoặc theo dõi xuyên trang (cross-site
  tracking).
- Bán hoặc chia sẻ thông tin cá nhân.
- Tải phông chữ hoặc script từ bên thứ ba ngoài hai dịch vụ Cloudflare nêu
  trên (phông chữ được đóng gói sẵn cùng ứng dụng).
- Báo cáo lỗi tới một dịch vụ từ xa.

## Cơ sở pháp lý (EU/EEA, Vương quốc Anh)

- Lưu trữ (hosting), bảo mật, phòng chống lạm dụng và bước xác minh con
  người: lợi ích hợp pháp trong việc vận hành một trang web công khai một
  cách an toàn (GDPR Art. 6(1)(f)).
- Thống kê lượt xem trang ẩn danh: lợi ích hợp pháp trong việc hiểu, ở
  dạng tổng hợp, cách trang web được sử dụng, với cơ chế từ chối (opt-out)
  dễ dàng và tôn trọng tín hiệu Global Privacy Control (Art. 6(1)(f)).
- Các tuỳ chọn được lưu trên thiết bị của bạn: thực sự cần thiết (strictly
  necessary) để cung cấp các tính năng bạn sử dụng.

Bạn có thể phản đối việc xử lý dựa trên lợi ích hợp pháp vào bất kỳ lúc
nào bằng cách gửi email tới privacy@poli0981.dev; đối với tính năng thống
kê, chỉ cần tắt nó trong mục Giao diện là đủ.

## Chuyển giao dữ liệu quốc tế

Cloudflare hoạt động trên toàn cầu, vì vậy dữ liệu yêu cầu có thể được xử
lý bên ngoài quốc gia của bạn, kể cả tại Hoa Kỳ. Cloudflare được chứng
nhận theo Khung quyền riêng tư dữ liệu EU-Hoa Kỳ (EU-U.S. Data Privacy
Framework, cùng các phần mở rộng dành cho Vương quốc Anh và Thuỵ Sĩ), và
phụ lục xử lý dữ liệu (data processing addendum) của Cloudflare có bao gồm
các Điều khoản hợp đồng tiêu chuẩn (SCC) của EU. Xem
[chính sách quyền riêng tư của Cloudflare](https://www.cloudflare.com/privacypolicy/).

## Thời hạn lưu giữ

- Dữ liệu trên thiết bị của bạn: cho đến khi bạn xoá; kết quả xác minh con
  người hết hạn sau 7 ngày, và bạn sẽ được yêu cầu chấp nhận lại mỗi khi
  phiên bản của chính sách này thay đổi.
- Workers Logs của API xác minh con người: 7 ngày.
- Dữ liệu xử lý yêu cầu và dữ liệu thống kê do Cloudflare nắm giữ: theo
  lịch lưu giữ riêng của Cloudflare; Web Analytics chỉ hiển thị số liệu
  tổng hợp.

## Quyền của bạn

Tuỳ thuộc vào nơi bạn sinh sống (ví dụ theo GDPR, UK GDPR hoặc CCPA/CPRA
của California), bạn có thể có quyền truy cập, chỉnh sửa hoặc xoá dữ liệu
cá nhân về bạn, quyền hạn chế hoặc phản đối việc xử lý dữ liệu đó, quyền
di chuyển dữ liệu (data portability) và quyền khiếu nại với cơ quan bảo vệ
dữ liệu có thẩm quyền. Bản thân JSONPrism không nắm giữ dữ liệu cá nhân nào
về bạn ngoài những gì Cloudflare xử lý thay mặt cho JSONPrism, vì vậy cách
tốt nhất để đáp ứng phần lớn các yêu cầu là xoá dữ liệu của trang web; với
bất kỳ yêu cầu nào khác, hãy gửi email tới privacy@poli0981.dev và bạn sẽ
nhận được phản hồi trong vòng 30 ngày. JSONPrism không bán hoặc chia sẻ
thông tin cá nhân và tôn trọng tín hiệu Global Privacy Control.

## Trẻ em

JSONPrism là một công cụ dành cho lập trình viên và không hướng tới trẻ em
dưới 13 tuổi (hoặc dưới độ tuổi đồng ý kỹ thuật số tại nơi bạn sinh sống).

## Thay đổi đối với chính sách này

Các thay đổi được liệt kê trong [CHANGELOG.md](../../../CHANGELOG.md). Khi
chính sách này có thay đổi đáng kể, số phiên bản của chính sách sẽ tăng lên
và ứng dụng sẽ yêu cầu bạn chấp nhận lại trước khi bạn tiếp tục.

## Liên hệ

- Quyền riêng tư: privacy@poli0981.dev
- Lỗ hổng bảo mật: xem [SECURITY.md](../../../SECURITY.md)
- Mọi vấn đề khác: [GitHub Issues](https://github.com/poli0981/jsonPrism/issues)
