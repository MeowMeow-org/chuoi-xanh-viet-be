export type GuideSection = {
  id: string
  title: string
  keywords: string[]
  content: string
}

export const APP_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'dang-ky-tai-khoan',
    title: 'Đăng ký tài khoản',
    keywords: [
      'đăng ký', 'tạo tài khoản', 'register', 'signup', 'tài khoản mới', 'vai trò',
      'nông dân', 'người mua', 'hợp tác xã', 'role', 'farmer', 'consumer', 'cooperative'
    ],
    content: `## Đăng ký tài khoản

Ứng dụng Chuỗi Xanh Việt hỗ trợ 3 loại tài khoản:
- **Nông dân (farmer):** Quản lý trang trại, vụ mùa, bán hàng
- **Người mua (consumer):** Mua sắm, truy xuất nguồn gốc, đánh giá sản phẩm
- **Hợp tác xã (cooperative):** Quản lý thành viên, kiểm tra mùa vụ, cấp chứng nhận

### Các bước đăng ký:
1. Truy cập màn hình **Đăng ký**
2. Nhập **Họ và tên** đầy đủ
3. Nhập **Email** hợp lệ (dùng để đăng nhập)
4. Nhập **Số điện thoại**
5. Chọn **Vai trò** phù hợp (nông dân / người mua / hợp tác xã)
6. Nhập **Mật khẩu** (tối thiểu 8 ký tự)
7. Nhập lại mật khẩu để **Xác nhận mật khẩu**
8. Nhấn nút **Đăng ký**

> Lưu ý: Admin không thể tự đăng ký, phải được tạo bởi hệ thống.`
  },

  {
    id: 'dang-nhap-tai-khoan',
    title: 'Đăng nhập và quản lý tài khoản',
    keywords: [
      'đăng nhập', 'login', 'đăng xuất', 'logout', 'quên mật khẩu', 'forgot password',
      'đổi mật khẩu', 'cập nhật hồ sơ', 'thông tin cá nhân', 'avatar', 'ảnh đại diện',
      'số điện thoại', 'họ tên', 'zalo', 'refresh token', 'token'
    ],
    content: `## Đăng nhập và quản lý tài khoản

### Đăng nhập:
1. Mở ứng dụng, chọn màn hình **Đăng nhập**
2. Nhập **Email** và **Mật khẩu** đã đăng ký
3. Nhấn **Đăng nhập**
4. Hệ thống trả về **access token** (dùng cho các yêu cầu tiếp theo) và **refresh token**

### Cập nhật thông tin cá nhân:
1. Vào **Hồ sơ cá nhân** (mục "Tôi" hoặc icon avatar)
2. Nhấn **Chỉnh sửa**
3. Có thể cập nhật: Họ tên, Số điện thoại, Ảnh đại diện (avatar URL), ID Zalo
4. Nhấn **Lưu**

### Đổi mật khẩu:
1. Vào **Hồ sơ cá nhân** → **Đổi mật khẩu**
2. Nhập **Mật khẩu hiện tại**
3. Nhập **Mật khẩu mới** và **Xác nhận mật khẩu mới**
4. Nhấn **Xác nhận**

### Quên mật khẩu:
1. Tại màn hình đăng nhập, nhấn **Quên mật khẩu**
2. Nhập **Email** đã đăng ký
3. Kiểm tra email nhận **link đặt lại mật khẩu**
4. Nhấn vào link, nhập mật khẩu mới và xác nhận
5. Đăng nhập lại bằng mật khẩu mới

### Đăng xuất:
1. Vào **Hồ sơ cá nhân** → nhấn **Đăng xuất**
2. Hệ thống hủy refresh token, yêu cầu đăng nhập lại`
  },

  {
    id: 'quan-ly-trang-trai',
    title: 'Quản lý trang trại',
    keywords: [
      'trang trại', 'farm', 'tạo trang trại', 'thêm trang trại', 'diện tích', 'vị trí',
      'tỉnh', 'huyện', 'xã', 'địa chỉ', 'tọa độ', 'gps', 'cây trồng chính', 'hợp tác xã',
      'xóa trang trại', 'cập nhật trang trại', 'danh sách trang trại'
    ],
    content: `## Quản lý trang trại (dành cho Nông dân)

### Tạo trang trại mới:
1. Vào mục **Trang trại** → nhấn **Thêm trang trại**
2. Điền thông tin:
   - **Tên trang trại** (bắt buộc)
   - **Diện tích** (ha, tùy chọn)
   - **Cây trồng chính** (ví dụ: lúa, cà phê, hồ tiêu)
   - **Tỉnh / Huyện / Xã** (chọn từ danh sách)
   - **Địa chỉ chi tiết**
   - **Tọa độ GPS** (latitude / longitude, tùy chọn)
   - **Tham gia hợp tác xã** (bật/tắt)
3. Nhấn **Tạo trang trại**

### Xem danh sách trang trại:
- Vào mục **Trang trại** → danh sách các trang trại của bạn hiện ra
- Có thể tìm kiếm theo tên trang trại

### Cập nhật thông tin trang trại:
1. Chọn trang trại cần sửa → nhấn **Chỉnh sửa**
2. Thay đổi thông tin mong muốn
3. Nhấn **Lưu**

### Xóa trang trại:
1. Chọn trang trại → nhấn **Xóa**
2. Xác nhận xóa`
  },

  {
    id: 'quan-ly-vu-mua',
    title: 'Quản lý vụ mùa',
    keywords: [
      'vụ mùa', 'season', 'tạo vụ', 'thêm vụ', 'mã vụ', 'ngày bắt đầu', 'ngày thu hoạch',
      'sản lượng', 'ước tính', 'thực tế', 'trạng thái vụ', 'nháp', 'đã niêm phong', 'hoàn thành',
      'draft', 'sealed', 'final', 'xóa vụ', 'cập nhật vụ', 'cây trồng'
    ],
    content: `## Quản lý vụ mùa (dành cho Nông dân)

Vụ mùa là chu kỳ canh tác của một loại cây trồng trên trang trại. Mỗi vụ có mã riêng để truy xuất nguồn gốc.

### Tạo vụ mùa mới:
1. Vào mục **Vụ mùa** → nhấn **Thêm vụ mùa**
2. Điền thông tin:
   - **Chọn trang trại** (bắt buộc)
   - **Tên cây trồng** (ví dụ: Lúa ST25, Hồ tiêu đen)
   - **Mã vụ** (tự động tạo nếu để trống)
   - **Ngày bắt đầu** (bắt buộc)
   - **Ngày bắt đầu thu hoạch** và **Ngày kết thúc thu hoạch** (tùy chọn)
   - **Sản lượng ước tính** và **đơn vị** (tấn, kg, tạ...)
   - **Sản lượng thực tế** (điền sau khi thu hoạch)
3. Nhấn **Tạo vụ mùa**

### Trạng thái vụ mùa:
- **Nháp (draft):** Đang canh tác, có thể chỉnh sửa tự do
- **Đã niêm phong (sealed):** Đã khóa nhật ký, chuẩn bị xuất bán. Không thể xóa nhật ký cũ
- **Hoàn thành (final):** Vụ mùa kết thúc hoàn toàn

### Chuyển trạng thái vụ mùa:
1. Mở chi tiết vụ mùa → nhấn **Chuyển trạng thái**
2. Chọn trạng thái mới → xác nhận
> Chỉ có thể chuyển theo chiều: nháp → niêm phong → hoàn thành

### Cập nhật vụ mùa:
1. Chọn vụ mùa → nhấn **Chỉnh sửa**
2. Thay đổi thông tin → nhấn **Lưu**

### Xóa vụ mùa:
- Chỉ xóa được khi vụ ở trạng thái **nháp** và chưa có dữ liệu gắn kết`
  },

  {
    id: 'nhat-ky-canh-tac',
    title: 'Nhật ký canh tác',
    keywords: [
      'nhật ký', 'diary', 'ghi chú', 'hoạt động', 'làm đất', 'gieo hạt', 'bón phân',
      'phun thuốc', 'tưới nước', 'thu hoạch', 'đóng gói', 'kiểm tra', 'hình ảnh',
      'đính kèm', 'attachment', 'sự kiện', 'event', 'canh tác', 'ghi nhật ký'
    ],
    content: `## Nhật ký canh tác (dành cho Nông dân)

Nhật ký canh tác ghi lại toàn bộ hoạt động trong một vụ mùa, phục vụ truy xuất nguồn gốc.

### Tạo nhật ký mới:
1. Vào **Vụ mùa** → chọn vụ → mục **Nhật ký**
2. Nhấn **Thêm hoạt động**
3. Chọn **Loại sự kiện:**
   - **Làm đất (land_prep):** Cày, bừa, xới đất
   - **Gieo hạt / Trồng cây (sowing):** Gieo, cấy, trồng
   - **Bón phân (fertilizing):** Phân NPK, hữu cơ, vi sinh
   - **Phun thuốc BVTV (pesticide):** Diệt sâu, diệt nấm, trừ cỏ
   - **Tưới nước (irrigation):** Tưới nhỏ giọt, phun mưa
   - **Thu hoạch (harvesting):** Ghi nhận thu hoạch
   - **Đóng gói (packing):** Sơ chế, đóng gói
   - **Kiểm tra (inspection):** Kiểm tra đồng ruộng
   - **Khác (other):** Các hoạt động khác
4. Chọn **Ngày thực hiện**
5. Nhập **Mô tả** chi tiết (ví dụ: "Bón 50kg NPK 16-16-8 cho 1 ha lúa")
6. Thêm **Dữ liệu bổ sung** nếu cần (extraData: JSON tùy chỉnh)
7. Nhấn **Lưu**

### Thêm hình ảnh vào nhật ký:
1. Mở nhật ký cần đính kèm ảnh
2. Nhấn **Thêm ảnh** hoặc **Upload hình**
3. Chọn ảnh từ thiết bị (upload qua mục Upload trước)
4. Nhập URL ảnh đã upload → nhấn **Lưu**

### Xem danh sách nhật ký:
- Lọc theo **loại sự kiện**, **trang trại**, **vụ mùa**
- Tìm kiếm theo ngày

### Xóa nhật ký:
- Nhật ký chỉ có thể xóa khi vụ mùa còn ở trạng thái **nháp**`
  },

  {
    id: 'don-vi-ban-hang-qr',
    title: 'Đơn vị bán hàng và QR Code',
    keywords: [
      'qr', 'qr code', 'đơn vị bán hàng', 'sale unit', 'lô', 'bao', 'thùng',
      'mã qr', 'quét qr', 'truy xuất', 'short code', 'mã ngắn', 'tạo qr',
      'in qr', 'chia sẻ qr', 'xuất bán', 'lô hàng'
    ],
    content: `## Đơn vị bán hàng và QR Code (dành cho Nông dân)

Đơn vị bán hàng là các lô/bao/thùng sản phẩm được gán mã QR để người mua truy xuất nguồn gốc.

### Tạo đơn vị bán hàng:
1. Vào **Vụ mùa** → chọn vụ → mục **Đơn vị bán hàng**
2. Nhấn **Tạo đơn vị bán hàng**
3. Điền thông tin:
   - **Số lượng** (ví dụ: 100)
   - **Đơn vị** (kg, tấn, túi, thùng...)
   - **Mã ngắn** (tùy chọn, hệ thống tự tạo nếu để trống)
4. Nhấn **Tạo**
5. Hệ thống tự động tạo **mã QR** và **đường dẫn QR** cho lô hàng

### Sử dụng QR Code:
- **In QR:** Tải về hoặc in trực tiếp mã QR dán lên bao bì sản phẩm
- **Chia sẻ:** Sao chép đường dẫn QR gửi cho đối tác hoặc khách hàng
- Khi người mua quét QR → xem toàn bộ thông tin trang trại, vụ mùa, nhật ký canh tác

### Xem danh sách đơn vị bán hàng:
- Vào **Vụ mùa** → chọn vụ → **Đơn vị bán hàng**
- Thấy tất cả lô hàng đã tạo với mã QR tương ứng

### Xóa đơn vị bán hàng:
- Nếu lô chưa bị quét bởi khách hàng: xóa hoàn toàn
- Nếu đã bị quét: vô hiệu hóa (không xóa cứng)`
  },

  {
    id: 'quan-ly-cua-hang',
    title: 'Quản lý cửa hàng và sản phẩm',
    keywords: [
      'cửa hàng', 'shop', 'tạo cửa hàng', 'sản phẩm', 'product', 'đăng bán',
      'giá bán', 'tồn kho', 'hình ảnh sản phẩm', 'mô tả sản phẩm', 'logo cửa hàng',
      'thêm sản phẩm', 'cập nhật sản phẩm', 'gian hàng', 'marketplace'
    ],
    content: `## Quản lý cửa hàng và sản phẩm (dành cho Nông dân)

### Tạo cửa hàng:
1. Vào mục **Cửa hàng** → nhấn **Tạo cửa hàng**
2. Chọn **Trang trại** liên kết với cửa hàng
3. Điền thông tin:
   - **Tên cửa hàng** (bắt buộc)
   - **Mô tả** (giới thiệu về cửa hàng)
   - **Ảnh đại diện cửa hàng** (logo/avatar)
4. Nhấn **Tạo**
> Mẹo: Dùng tính năng **AI gợi ý tên và mô tả cửa hàng** để tự động tạo nội dung phù hợp

### Thêm sản phẩm vào cửa hàng:
1. Vào **Cửa hàng** của bạn → nhấn **Thêm sản phẩm**
2. Chọn **Đơn vị bán hàng** (lô hàng đã tạo QR từ vụ mùa)
3. Điền thông tin sản phẩm:
   - **Tên sản phẩm** (tự động lấy từ vụ mùa nếu để trống)
   - **Mô tả**
   - **Giá bán** (VNĐ, bắt buộc)
   - **Đơn vị** (kg, túi, thùng...)
   - **Số lượng tồn kho**
   - **Hình ảnh sản phẩm**
4. Nhấn **Thêm sản phẩm**

### Cập nhật cửa hàng:
1. Vào **Cửa hàng** → nhấn **Chỉnh sửa cửa hàng**
2. Sửa tên, mô tả, ảnh đại diện, trạng thái (mở/đóng)
3. Nhấn **Lưu**`
  },

  {
    id: 'quan-ly-don-hang-ban',
    title: 'Quản lý đơn hàng (Nông dân bán)',
    keywords: [
      'đơn hàng', 'order', 'xác nhận đơn', 'giao hàng', 'đã giao', 'hủy đơn',
      'trạng thái đơn', 'pending', 'confirmed', 'shipping', 'delivered', 'cancelled',
      'đơn của tôi', 'quản lý đơn', 'xử lý đơn', 'bên bán', 'nông dân bán'
    ],
    content: `## Quản lý đơn hàng (dành cho Nông dân - bên bán)

### Xem đơn hàng nhận được:
1. Vào mục **Đơn hàng** → chọn tab **Đơn nhận được**
2. Thấy danh sách tất cả đơn hàng của cửa hàng bạn
3. Lọc theo trạng thái: chờ xác nhận, đã xác nhận, đang giao, đã giao, đã hủy

### Xử lý đơn hàng theo trạng thái:
Các trạng thái đơn hàng theo thứ tự:
1. **Chờ xác nhận (pending):** Khách vừa đặt, bạn cần xem xét
2. **Đã xác nhận (confirmed):** Bạn xác nhận có hàng, chuẩn bị giao
3. **Đang giao (shipping):** Đã giao cho đơn vị vận chuyển
4. **Đã giao (delivered):** Khách đã nhận hàng thành công
5. **Đã hủy (cancelled):** Đơn bị hủy (bởi khách hoặc hệ thống)

### Cập nhật trạng thái đơn hàng:
1. Mở đơn hàng cần xử lý
2. Nhấn **Cập nhật trạng thái**
3. Chọn trạng thái tiếp theo
4. Xác nhận

> Lưu ý: Chỉ nông dân (bên bán) mới có thể cập nhật trạng thái đơn hàng. Khách chỉ có thể hủy đơn khi còn ở trạng thái "chờ xác nhận".`
  },

  {
    id: 'mua-sam-dat-hang',
    title: 'Mua sắm và đặt hàng',
    keywords: [
      'mua hàng', 'đặt hàng', 'order', 'thanh toán', 'cod', 'tiền mặt', 'giỏ hàng',
      'địa chỉ giao hàng', 'số lượng', 'tổng tiền', 'xem sản phẩm', 'duyệt sản phẩm',
      'marketplace', 'tìm kiếm sản phẩm', 'hủy đơn', 'người mua', 'consumer'
    ],
    content: `## Mua sắm và đặt hàng (dành cho Người mua)

### Tìm kiếm và xem sản phẩm:
1. Vào mục **Cửa hàng** hoặc **Sản phẩm**
2. Tìm kiếm theo **tên sản phẩm**, **tỉnh/thành phố**
3. Nhấn vào sản phẩm để xem chi tiết: giá, tồn kho, thông tin trang trại, vụ mùa
4. Xem **chứng nhận** của nông trại (VietGAP, GlobalGAP, Organic)

### Đặt hàng:
1. Chọn sản phẩm → nhấn **Mua ngay**
2. Nhập **Số lượng** muốn mua
3. Điền thông tin giao hàng:
   - **Tên người nhận**
   - **Số điện thoại**
   - **Địa chỉ giao hàng** chi tiết
4. Chọn **Phương thức thanh toán:** Thanh toán khi nhận hàng (COD)
5. Thêm **Ghi chú** cho người bán (nếu cần)
6. Nhấn **Đặt hàng**

### Theo dõi đơn hàng:
1. Vào **Đơn hàng của tôi**
2. Xem trạng thái từng đơn: chờ xác nhận → đã xác nhận → đang giao → đã giao

### Hủy đơn hàng:
- Chỉ hủy được khi đơn còn ở trạng thái **chờ xác nhận**
1. Mở đơn hàng cần hủy → nhấn **Hủy đơn**
2. Xác nhận hủy`
  },

  {
    id: 'truy-xuat-nguon-goc',
    title: 'Truy xuất nguồn gốc sản phẩm',
    keywords: [
      'truy xuất', 'nguồn gốc', 'trace', 'quét qr', 'scan qr', 'xác minh', 'verify',
      'toàn vẹn dữ liệu', 'tính xác thực', 'lịch sử canh tác', 'thông tin trang trại',
      'kiểm tra hàng thật', 'kiểm chứng', 'chuỗi cung ứng', 'blockchain'
    ],
    content: `## Truy xuất nguồn gốc sản phẩm

### Quét mã QR trên sản phẩm:
1. Mở ứng dụng → vào mục **Quét QR** hoặc dùng camera
2. Quét mã QR trên bao bì sản phẩm
3. Hệ thống hiển thị ngay:
   - Thông tin trang trại (tên, địa chỉ, diện tích)
   - Thông tin nông dân (họ tên, liên hệ)
   - Vụ mùa (tên cây trồng, ngày bắt đầu, ngày thu hoạch)
   - Toàn bộ nhật ký canh tác (làm đất, bón phân, phun thuốc...)
   - Kết quả kiểm tra của hợp tác xã
   - Chứng nhận (VietGAP, GlobalGAP, Organic)

### Xác minh tính toàn vẹn dữ liệu:
1. Trong trang truy xuất → nhấn **Xác minh dữ liệu**
2. Hệ thống so sánh dữ liệu hiện tại với mốc đã niêm phong (anchor)
3. Kết quả: **Hợp lệ** (dữ liệu chưa bị chỉnh sửa) hoặc **Không hợp lệ** (có sai khác)

### Xem chi tiết vụ mùa qua mã vụ:
1. Vào mục **Truy xuất** → nhập mã vụ hoặc mã lô hàng
2. Xem toàn bộ chuỗi cung ứng từ trang trại đến sản phẩm`
  },

  {
    id: 'danh-gia-san-pham',
    title: 'Đánh giá sản phẩm và cửa hàng',
    keywords: [
      'đánh giá', 'review', 'nhận xét', 'sao', 'rating', 'bình luận', 'comment',
      'phản hồi', 'chất lượng sản phẩm', 'hài lòng', 'không hài lòng',
      'cập nhật đánh giá', 'xem đánh giá'
    ],
    content: `## Đánh giá sản phẩm và cửa hàng (dành cho Người mua)

### Điều kiện để đánh giá:
- Chỉ đánh giá được sau khi đơn hàng có trạng thái **Đã giao (delivered)**
- Mỗi sản phẩm trong mỗi đơn chỉ được đánh giá **1 lần**

### Tạo đánh giá:
1. Vào **Đơn hàng của tôi** → chọn đơn đã giao
2. Nhấn **Đánh giá sản phẩm**
3. Chọn **Số sao** (1-5 sao):
   - 5 sao: Xuất sắc
   - 4 sao: Tốt
   - 3 sao: Bình thường
   - 2 sao: Kém
   - 1 sao: Rất kém
4. Viết **Nhận xét** chi tiết về sản phẩm, chất lượng, giao hàng
5. Nhấn **Gửi đánh giá**

### Cập nhật đánh giá:
1. Vào **Lịch sử đánh giá** hoặc trang sản phẩm
2. Tìm đánh giá của bạn → nhấn **Sửa**
3. Điều chỉnh số sao hoặc nhận xét → nhấn **Lưu**

### Xem đánh giá của sản phẩm/cửa hàng:
- Vào trang sản phẩm hoặc cửa hàng → mục **Đánh giá**
- Thấy tất cả nhận xét từ người mua đã mua thực tế`
  },

  {
    id: 'hop-tac-xa-tham-gia',
    title: 'Tham gia và quản lý hợp tác xã',
    keywords: [
      'hợp tác xã', 'htx', 'cooperative', 'tham gia', 'gia nhập', 'yêu cầu',
      'chấp nhận', 'từ chối', 'thành viên', 'membership', 'duyệt thành viên',
      'danh sách hợp tác xã', 'rời hợp tác xã', 'quản lý thành viên'
    ],
    content: `## Hợp tác xã (HTX)

### Dành cho Nông dân - Yêu cầu gia nhập HTX:
1. Vào mục **Hợp tác xã** → xem danh sách HTX đang hoạt động
2. Chọn HTX muốn gia nhập → nhấn **Yêu cầu tham gia**
3. Chọn **Trang trại** muốn đăng ký vào HTX
4. Nhấn **Gửi yêu cầu**
5. Chờ HTX xét duyệt (trạng thái: **Chờ duyệt → Đã chấp nhận / Bị từ chối**)

### Dành cho HTX - Xét duyệt thành viên:
1. Vào mục **Quản lý thành viên** → xem danh sách yêu cầu
2. Lọc theo trạng thái: **chờ duyệt**, **đã chấp nhận**, **đã từ chối**
3. Xem thông tin nông dân và trang trại đăng ký
4. Nhấn **Chấp nhận** hoặc **Từ chối** (kèm ghi chú lý do)

### Dành cho HTX - Xem danh sách vụ mùa của thành viên:
1. Vào **Quản lý thành viên** → chọn trang trại thành viên
2. Xem tất cả vụ mùa của trang trại đó
3. Chọn vụ cần kiểm tra để tạo biên bản kiểm tra`
  },

  {
    id: 'kiem-tra-mua-vu',
    title: 'Kiểm tra mùa vụ (Hợp tác xã)',
    keywords: [
      'kiểm tra', 'inspection', 'kiểm định', 'biên bản', 'kết quả kiểm tra',
      'đạt', 'không đạt', 'cần cải thiện', 'pass', 'fail', 'needs_work',
      'thanh tra', 'giám sát', 'inspector', 'htx kiểm tra'
    ],
    content: `## Kiểm tra mùa vụ (dành cho Hợp tác xã)

### Tạo biên bản kiểm tra:
1. Vào **Quản lý thành viên** → chọn trang trại → chọn vụ mùa cần kiểm tra
2. Nhấn **Tạo biên bản kiểm tra**
3. Chọn **Kết quả:**
   - **Đạt (pass):** Vụ mùa đạt tiêu chuẩn
   - **Không đạt (fail):** Không đạt, cần xử lý
   - **Cần cải thiện (needs_work):** Đạt một phần, cần chỉnh sửa
4. Nhập **Tóm tắt** kết quả kiểm tra
5. Chọn **Ngày kiểm tra**
6. Thêm **Hình ảnh** minh chứng (nếu có)
7. Nhấn **Lưu biên bản**

### Xem danh sách biên bản kiểm tra:
- Vào vụ mùa bất kỳ → mục **Lịch sử kiểm tra**
- Xem tất cả biên bản và kết quả theo thời gian

### Xóa biên bản kiểm tra:
- Chỉ người tạo mới có thể xóa
- Không thể xóa nếu vụ mùa đã được **niêm phong (anchor)**`
  },

  {
    id: 'chung-nhan-nong-nghiep',
    title: 'Chứng nhận nông nghiệp',
    keywords: [
      'chứng nhận', 'certificate', 'vietgap', 'globalgap', 'organic', 'hữu cơ',
      'nộp chứng nhận', 'xét duyệt', 'chứng chỉ', 'ngày cấp', 'ngày hết hạn',
      'file chứng nhận', 'badge', 'huy hiệu', 'phê duyệt', 'thu hồi', 'revoke'
    ],
    content: `## Chứng nhận nông nghiệp

### Dành cho Nông dân - Nộp chứng nhận trang trại:
1. Vào mục **Chứng nhận** → nhấn **Nộp chứng nhận**
2. Chọn **Loại chứng nhận:**
   - VietGAP
   - GlobalGAP
   - Hữu cơ (Organic)
   - Khác
3. Điền thông tin:
   - **Số chứng nhận**
   - **Đơn vị cấp**
   - **Ngày cấp** và **Ngày hết hạn**
   - **Upload file chứng nhận** (PDF/ảnh)
4. Nhấn **Nộp** → chờ HTX hoặc admin phê duyệt
5. Trạng thái: **Chờ duyệt → Đã duyệt / Bị từ chối**

### Dành cho HTX - Quản lý chứng nhận HTX:
1. Vào **Chứng nhận HTX** → nhấn **Tạo chứng nhận**
2. Điền thông tin chứng nhận của HTX
3. **Thêm trang trại vào phạm vi chứng nhận:**
   - Vào chứng nhận → mục **Trang trại trong phạm vi**
   - Chọn trang trại thành viên đủ điều kiện → nhấn **Thêm**
4. Trang trại trong phạm vi sẽ hiển thị **huy hiệu (badge)** chứng nhận khi người mua xem

### Xem huy hiệu chứng nhận:
- Trang sản phẩm/cửa hàng hiển thị các huy hiệu: VietGAP, GlobalGAP, Organic
- Người mua có thể nhấn vào huy hiệu để xem chi tiết chứng nhận`
  },

  {
    id: 'chatbot-ai',
    title: 'Chatbot AI nông nghiệp',
    keywords: [
      'chatbot', 'ai', 'trợ lý', 'hỏi đáp', 'tư vấn', 'canh tác', 'bệnh cây',
      'chẩn đoán', 'diagnose', 'giá nông sản', 'thị trường', 'market',
      'chat', 'hỏi chatbot', 'trợ lý ai', 'openai', 'gpt', 'hướng dẫn sử dụng chatbot'
    ],
    content: `## Chatbot AI nông nghiệp

Chatbot AI hỗ trợ 4 tính năng chính, chỉ trả lời các câu hỏi liên quan đến nông nghiệp và nông sản.

### 1. Tư vấn kỹ thuật canh tác:
1. Vào mục **Chatbot** → chọn **Tư vấn canh tác**
2. Nhập câu hỏi về:
   - Quy trình trồng, chăm sóc cây
   - Tiêu chuẩn VietGAP, GlobalGAP
   - Phòng trừ sâu bệnh, tên thuốc, liều lượng
   - Bón phân, tưới nước, thu hoạch
3. Nhấn **Gửi** → nhận câu trả lời chi tiết bằng tiếng Việt
4. Có thể tiếp tục hỏi thêm trong cùng cuộc trò chuyện

### 2. Chẩn đoán bệnh cây qua ảnh:
1. Vào **Chatbot** → chọn **Chẩn đoán bệnh cây**
2. Nhấn **Chọn ảnh** → chọn ảnh cây bị bệnh (JPG, PNG, WebP, tối đa 10MB)
3. Thêm **Ghi chú** mô tả thêm (tùy chọn, ví dụ: "Lá bị vàng từ 3 ngày trước")
4. Nhấn **Gửi** → AI phân tích và trả về:
   - Tên bệnh và khả năng mắc phải
   - Nguyên nhân (nấm, vi khuẩn, thiếu dinh dưỡng...)
   - Mức độ (Nhẹ / Trung bình / Nặng)
   - Giải pháp xử lý + tên thuốc + liều lượng
   - Cách phòng ngừa tái phát

### 3. Tư vấn giá thị trường nông sản:
1. Vào **Chatbot** → chọn **Giá thị trường**
2. Nhập tên nông sản và tỉnh/vùng (ví dụ: "Giá lúa tại An Giang hôm nay")
3. AI tìm kiếm giá thực tế từ internet và tổng hợp:
   - Giá cụ thể (VNĐ/kg hoặc VNĐ/tấn)
   - Xu hướng giá và cung cầu
   - Gợi ý thời điểm bán tốt nhất
   - Link nguồn tham khảo

### 4. Hướng dẫn sử dụng ứng dụng:
1. Vào **Chatbot** → chọn **Hỏi về ứng dụng** hoặc gõ câu hỏi
2. Đặt câu hỏi về cách dùng tính năng (ví dụ: "Làm sao tạo vụ mùa?", "Cách đặt hàng như thế nào?")
3. AI trả lời từng bước rõ ràng dựa trên tài liệu hướng dẫn chính thức`
  },

  {
    id: 'dien-dan-cong-dong',
    title: 'Diễn đàn cộng đồng',
    keywords: [
      'diễn đàn', 'forum', 'bài viết', 'post', 'bình luận', 'comment', 'đặt câu hỏi',
      'chia sẻ kinh nghiệm', 'nhãn', 'label', 'tag', 'cộng đồng', 'tìm kiếm bài viết',
      'xóa bài', 'chỉnh sửa bài', 'ẩn bài', 'locked'
    ],
    content: `## Diễn đàn cộng đồng

Diễn đàn là nơi nông dân, người mua, và HTX chia sẻ kinh nghiệm, đặt câu hỏi.

### Xem bài viết:
- Vào mục **Diễn đàn** → thấy danh sách bài viết mới nhất
- Lọc theo **nhãn** (canh tác, bệnh cây, thị trường, v.v.)
- Tìm kiếm theo từ khóa

### Tạo bài viết mới:
1. Nhấn **Tạo bài viết**
2. Nhập **Tiêu đề** bài viết
3. Soạn **Nội dung** chi tiết
4. Chọn **Nhãn** phù hợp (có thể chọn nhiều nhãn)
5. Thêm **Hình ảnh** minh họa (upload ảnh trước, dùng URL)
6. Nhấn **Đăng bài**

### Bình luận:
1. Mở bài viết → kéo xuống mục **Bình luận**
2. Nhập nội dung bình luận → nhấn **Gửi**
3. Có thể **Chỉnh sửa** hoặc **Xóa** bình luận của mình

### Chỉnh sửa / Xóa bài viết:
- Chỉ tác giả và admin mới có thể sửa/xóa
1. Vào bài viết → nhấn **Chỉnh sửa** hoặc **Xóa**
2. Xác nhận hành động

### Trạng thái bài viết:
- **Hoạt động (active):** Hiển thị công khai
- **Ẩn (hidden):** Chỉ tác giả và admin thấy
- **Khóa (locked):** Không cho bình luận thêm`
  },

  {
    id: 'nhan-tin-truc-tiep',
    title: 'Nhắn tin trực tiếp',
    keywords: [
      'nhắn tin', 'chat', 'tin nhắn', 'message', 'conversation', 'cuộc trò chuyện',
      'liên hệ', 'nói chuyện', 'websocket', 'real-time', 'trực tiếp', 'inbox'
    ],
    content: `## Nhắn tin trực tiếp (Chat 1-1)

### Bắt đầu cuộc trò chuyện:
1. Vào mục **Tin nhắn** hoặc **Chat**
2. Nhấn **Cuộc trò chuyện mới** / **+**
3. Tìm kiếm người dùng muốn nhắn tin (theo tên hoặc email)
4. Nhấn **Bắt đầu trò chuyện**

### Gửi tin nhắn:
1. Chọn cuộc trò chuyện từ danh sách
2. Nhập nội dung tin nhắn ở ô bên dưới
3. Nhấn **Gửi** hoặc nhấn Enter

### Xem lịch sử tin nhắn:
- Kéo lên để xem tin nhắn cũ hơn
- Tin nhắn được lưu theo thứ tự thời gian

### Danh sách cuộc trò chuyện:
- Vào **Tin nhắn** → thấy tất cả các cuộc trò chuyện đang có
- Cuộc trò chuyện mới nhất hiển thị đầu tiên`
  },

  {
    id: 'thong-bao',
    title: 'Thông báo',
    keywords: [
      'thông báo', 'notification', 'bell', 'chuông', 'đọc thông báo', 'chưa đọc',
      'đánh dấu đã đọc', 'xóa thông báo', 'tin báo', 'cảnh báo', 'nhắc nhở'
    ],
    content: `## Thông báo

### Xem thông báo:
1. Nhấn vào **biểu tượng chuông** trên thanh điều hướng
2. Thấy danh sách tất cả thông báo (mới nhất ở đầu)
3. Thông báo chưa đọc được đánh dấu khác màu

### Các loại thông báo hệ thống:
- **Đơn hàng:** Đơn mới, xác nhận đơn, đơn đang giao, đã giao
- **Thành viên HTX:** Yêu cầu tham gia, chấp nhận/từ chối
- **Chứng nhận:** Được duyệt, bị từ chối, sắp hết hạn
- **Đánh giá:** Có đánh giá mới cho cửa hàng
- **Diễn đàn:** Bình luận mới trên bài viết của bạn

### Đánh dấu đã đọc:
- **Đánh dấu từng thông báo:** Nhấn vào thông báo → tự động đánh dấu đã đọc
- **Đánh dấu tất cả:** Nhấn **Đọc tất cả**

### Thông báo Zalo:
- Liên kết tài khoản Zalo trong **Hồ sơ cá nhân** → **Cập nhật ID Zalo**
- Nhận thông báo quan trọng trực tiếp qua Zalo OA`
  },

  {
    id: 'upload-file',
    title: 'Upload hình ảnh và tài liệu',
    keywords: [
      'upload', 'tải lên', 'hình ảnh', 'ảnh', 'tài liệu', 'pdf', 'file',
      'đính kèm', 'attachment', 'ảnh sản phẩm', 'ảnh nhật ký', 'chứng từ',
      'kích thước', 'dung lượng', 'định dạng', 'jpg', 'png', 'jpeg'
    ],
    content: `## Upload hình ảnh và tài liệu

### Upload hình ảnh:
1. Vào mục cần đính kèm ảnh (nhật ký, sản phẩm, diễn đàn, cửa hàng...)
2. Nhấn **Upload ảnh** hoặc **Chọn hình**
3. Chọn file từ thiết bị (hỗ trợ: JPG, PNG, WebP, GIF)
4. Giới hạn: tối đa **3 ảnh**, mỗi ảnh **12MB**
5. Hệ thống trả về URL ảnh → tự động điền vào trường cần thiết

### Upload tài liệu (cho chứng nhận):
1. Vào mục **Chứng nhận** → nhấn **Upload tài liệu**
2. Chọn file chứng nhận (hỗ trợ: PDF, JPG, PNG, WebP)
3. Giới hạn: tối đa **5 file**, mỗi file **25MB**
4. Hệ thống trả về URL tài liệu → dùng khi nộp chứng nhận

### Lưu ý khi upload:
- Ảnh phải đúng định dạng hỗ trợ
- Không upload file chứa thông tin nhạy cảm ngoài mục đích sử dụng
- URL ảnh có thể dùng lại ở nhiều nơi trong ứng dụng`
  },

  {
    id: 'neo-du-lieu',
    title: 'Neo dữ liệu (Anchor) - Đảm bảo tính toàn vẹn',
    keywords: [
      'anchor', 'neo dữ liệu', 'niêm phong', 'hash', 'toàn vẹn', 'xác thực',
      'blockchain', 'mã hóa', 'kiểm chứng', 'chống giả mạo', 'dữ liệu bất biến'
    ],
    content: `## Neo dữ liệu (Anchor) - Đảm bảo tính toàn vẹn

Tính năng Anchor tạo "dấu ấn số" cho toàn bộ dữ liệu vụ mùa, đảm bảo dữ liệu không bị chỉnh sửa sau khi niêm phong.

### Khi nào cần tạo Anchor:
- Sau khi hoàn thiện nhật ký canh tác và kiểm tra của HTX
- Trước khi chuyển trạng thái vụ sang "Hoàn thành"

### Cách tạo Anchor:
1. Vào vụ mùa đang ở trạng thái **Đã niêm phong (sealed)**
2. Nhấn **Tạo điểm xác thực (Anchor)**
3. Hệ thống tạo mã băm (hash) SHA-256 từ toàn bộ dữ liệu vụ
4. Lưu mốc này để đối chiếu sau

### Người mua xác minh dữ liệu:
- Sau khi quét QR → nhấn **Xác minh tính toàn vẹn**
- Hệ thống tính lại hash và so sánh với mốc đã lưu
- **Hợp lệ:** Dữ liệu đáng tin cậy, chưa bị chỉnh sửa
- **Không hợp lệ:** Có sự sai khác, cần liên hệ nhà sản xuất`
  }
]
