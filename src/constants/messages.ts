const USER_MESSAGES = {

  LOGIN_SUCCESS: 'Đăng nhập thành công',

  REGISTER_SUCCESS: 'Đăng ký thành công',

  REGISTER_ROLE_REQUIRED: 'Vui lòng chọn vai trò',

  REGISTER_ROLE_INVALID: 'Vai trò phải là khách hàng (consumer) hoặc nông dân (farmer)',

  LOGOUT_SUCCESS: 'Đăng xuất thành công',

  REFRESH_TOKEN_SUCCESS: 'Làm mới phiên đăng nhập thành công',

  VERIFY_EMAIL_SUCCESS: 'Xác minh email thành công',

  FORGOT_PASSWORD_SUCCESS: 'Đã gửi hướng dẫn đặt lại mật khẩu',

  RESET_PASSWORD_SUCCESS: 'Đặt lại mật khẩu thành công',

  INCORRECT_EMAIL_OR_PASSWORD: 'Email hoặc mật khẩu không đúng',

  GET_ME_SUCCESS: 'Lấy thông tin tài khoản thành công',

  UPDATE_PROFILE_SUCCESS: 'Cập nhật hồ sơ thành công',

  ZALO_USER_ID_INVALID: 'zaloUserId phải gồm 1–50 chữ số (ID người dùng Zalo OA)',

  CHANGE_PASSWORD_SUCCESS: 'Đổi mật khẩu thành công',

  CURRENT_PASSWORD_INCORRECT: 'Mật khẩu hiện tại không đúng',

  AVATAR_URL_INVALID: 'avatarUrl phải là URL hợp lệ (tối đa 2048 ký tự)',

  GET_FARMS_SUCCESS: 'Lấy danh sách nông trại thành công',

  CREATE_FARM_SUCCESS: 'Tạo nông trại thành công',

  UPDATE_FARM_SUCCESS: 'Cập nhật nông trại thành công',

  DELETE_FARM_SUCCESS: 'Xóa nông trại thành công',

  GET_MY_FARMS_SUCCESS: 'Lấy danh sách nông trại của bạn thành công',

  EMAIL_IS_REQUIRED: 'Vui lòng nhập email',

  ACCESS_TOKEN_IS_REQUIRED: 'Vui lòng cung cấp access token',

  PASSWORD_IS_REQUIRED: 'Vui lòng nhập mật khẩu',

  EMAIL_IS_NOT_EXISTED: 'Email chưa được đăng ký',

  USER_NOT_FOUND: 'Không tìm thấy người dùng',

  CHECK_YOUR_EMAIL_TO_RESET_PASSWORD: 'Vui lòng kiểm tra email để đặt lại mật khẩu',

  FORGOT_PASSWORD_TOKEN_IS_REQUIRED: 'Vui lòng cung cấp token quên mật khẩu',

  VERIFY_FORGOT_PASSWORD_IS_INVALID: 'Xác minh quên mật khẩu không hợp lệ',

  VERIFY_FORGOT_PASSWORD_IS_EXPIRED: 'Liên kết đặt lại mật khẩu đã hết hạn',

  VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESS: 'Xác minh token quên mật khẩu thành công',

  CONFIRM_PASSWORD_IS_REQUIRED: 'Vui lòng nhập lại mật khẩu',

  CONFIRM_PASSWORD_MUST_BE_A_STRING: 'Xác nhận mật khẩu phải là chuỗi',

  CONFIRM_PASSWORD_DOES_NOT_MATCH_PASSWORD: 'Mật khẩu xác nhận không khớp',

  CREATE_SEASON_SUCCESS: 'Tạo mùa vụ thành công',

  GET_SEASONS_SUCCESS: 'Lấy danh sách mùa vụ thành công',

  GET_SEASON_DETAIL_SUCCESS: 'Lấy chi tiết mùa vụ thành công',

  UPDATE_SEASON_SUCCESS: 'Cập nhật mùa vụ thành công',

  DELETE_SEASON_SUCCESS: 'Xóa mùa vụ thành công',

  CHANGE_SEASON_STATUS_SUCCESS: 'Đổi trạng thái mùa vụ thành công',

  SEASON_CODE_ALREADY_EXISTS: 'Mã mùa vụ đã tồn tại',

  SEASON_CODE_GENERATION_FAILED: 'Không tạo được mã mùa vụ, vui lòng thử lại',

  SEASON_HARVEST_START_BEFORE_SEASON_START: 'Ngày bắt đầu thu hoạch không được trước ngày bắt đầu mùa vụ',

  SEASON_HARVEST_END_BEFORE_HARVEST_START: 'Ngày kết thúc thu hoạch phải sau hoặc cùng ngày bắt đầu thu hoạch',

  SEASON_HARVEST_END_BEFORE_SEASON_START: 'Ngày kết thúc thu hoạch không được trước ngày bắt đầu mùa vụ',

  SEASON_ESTIMATED_YIELD_REQUIRED: 'Năng suất dự kiến bắt buộc và phải là số lớn hơn 0',

  SEASON_HARVEST_START_REQUIRED: 'Vui lòng nhập ngày dự kiến thu hoạch (để HTX lên lịch kiểm tra trước thu hoạch)',

  CREATE_DIARY_SUCCESS: 'Tạo nhật ký thành công',

  GET_DIARIES_SUCCESS: 'Lấy danh sách nhật ký thành công',

  GET_DIARY_DETAIL_SUCCESS: 'Lấy chi tiết nhật ký thành công',

  UPDATE_DIARY_SUCCESS: 'Cập nhật nhật ký thành công',

  DELETE_DIARY_SUCCESS: 'Xóa nhật ký thành công',

  ADD_DIARY_ATTACHMENT_SUCCESS: 'Thêm tệp đính kèm nhật ký thành công',

  DELETE_DIARY_ATTACHMENT_SUCCESS: 'Xóa tệp đính kèm nhật ký thành công',

  DIARY_ATTACHMENT_NOT_FOUND: 'Không tìm thấy tệp đính kèm nhật ký',

  DIARY_NOT_FOUND: 'Không tìm thấy nhật ký',

  DIARY_FARM_SEASON_MISMATCH: 'farmId không thuộc seasonId đã chọn',

  DIARY_SEASON_IS_ANCHORED_CANNOT_UPDATE: 'Mùa vụ đã niêm phong, không thể sửa nhật ký',

  DIARY_SEASON_IS_ANCHORED_CANNOT_DELETE: 'Mùa vụ đã niêm phong, không thể xóa nhật ký',

  SEASON_NOT_FOUND: 'Không tìm thấy mùa vụ',

  FARM_NOT_FOUND_OR_FORBIDDEN: 'Không tìm thấy nông trại hoặc bạn không có quyền',

  FARM_HAS_RELATED_DATA: 'Nông trại còn dữ liệu liên quan, không thể xóa',

  FARM_DELETE_BLOCKED_SEASONS: 'Không xóa được nông trại: vẫn còn mùa vụ. Xóa hoặc xử lý hết mùa vụ trước.',

  FARM_DELETE_BLOCKED_COOP:

    'Không xóa được nông trại: còn hồ sơ hợp tác xã (kể cả đang chờ). Huỷ yêu cầu / rời HTX trước.',

  FARM_DELETE_BLOCKED_DIARY: 'Không xóa được nông trại: vẫn còn nhật ký canh tác gắn nông trại này.',

  FARM_DELETE_BLOCKED_SHOP:

    'Không xóa được nông trại: đã tạo gian hàng cho trại này. Cần gỡ gian hàng (hoặc liên hệ hỗ trợ) trước khi xóa trại.',

  SEASON_HAS_RELATED_DATA: 'Mùa vụ còn dữ liệu liên quan, không thể xóa',

  SEASON_IS_ANCHORED_CANNOT_UPDATE: 'Mùa vụ đã niêm phong, không thể sửa thông tin cơ bản',

  SEASON_IS_ANCHORED_CANNOT_DELETE: 'Mùa vụ đã niêm phong, không thể xóa',

  INVALID_SEASON_STATUS_TRANSITION: 'Chuyển trạng thái mùa vụ không hợp lệ',

  REFRESH_TOKEN_IS_REQUIRED: 'Vui lòng cung cấp refresh token',

  REFRESH_TOKEN_IS_INVALID: 'Refresh token không hợp lệ',

  REFRESH_TOKEN_NOT_FOUND: 'Không tìm thấy refresh token',

  EMAIL_ALREADY_EXISTS: 'Email đã được sử dụng',

  PHONE_ALREADY_EXISTS: 'Số điện thoại đã được sử dụng',

  FULL_NAME_IS_REQUIRED: 'Vui lòng nhập họ tên',

  PHONE_IS_REQUIRED: 'Vui lòng nhập số điện thoại',

  GET_HTX_LIST_SUCCESS: 'Lấy danh sách hợp tác xã thành công',

  GET_COOPERATIVE_MEMBERSHIPS_SUCCESS: 'Lấy danh sách thành viên HTX thành công',

  COOPERATIVE_USER_NOT_FOUND: 'Tài khoản HTX không tồn tại hoặc đã ngưng hoạt động',

  COOPERATIVE_MEMBERSHIP_NOT_FOUND: 'Không tìm thấy thành viên HTX',

  COOPERATIVE_MEMBERSHIP_FORBIDDEN: 'Bạn không thể quản lý thành viên này',

  COOPERATIVE_MEMBERSHIP_APPROVE_SUCCESS: 'Đã duyệt thành viên; người dùng hiện là nông dân',

  COOPERATIVE_MEMBERSHIP_REJECT_SUCCESS: 'Đã từ chối thành viên',

  COOPERATIVE_MEMBERSHIP_INVALID_STATE: 'Thành viên không ở trạng thái chờ duyệt',

  FORBIDDEN_NOT_COOPERATIVE: 'Chỉ tài khoản hợp tác xã mới thực hiện được thao tác này',

  FORBIDDEN_NOT_FARMER: 'Chỉ tài khoản nông dân mới thực hiện được thao tác này',

  FARM_NAME_IS_REQUIRED: 'Vui lòng nhập tên nông trại',

  COOPERATIVE_USER_ID_IS_REQUIRED: 'Vui lòng nhập ID tài khoản HTX',

  COOPERATIVE_JOIN_REQUEST_SUCCESS: 'Đã gửi yêu cầu tham gia; đang chờ HTX duyệt',

  FARM_ID_IS_REQUIRED: 'Vui lòng nhập farm_id',

  FARM_ALREADY_LINKED_TO_COOPERATIVE: 'Nông trại đã được liên kết với một hợp tác xã',

  COOPERATIVE_JOIN_PENDING_EXISTS: 'Đã có yêu cầu tham gia đang chờ duyệt cho nông trại này',

  CREATE_FORUM_POST_SUCCESS: 'Đăng bài diễn đàn thành công',

  GET_FORUM_POSTS_SUCCESS: 'Lấy danh sách bài viết thành công',

  GET_FORUM_POST_DETAIL_SUCCESS: 'Lấy chi tiết bài viết thành công',

  UPDATE_FORUM_POST_SUCCESS: 'Cập nhật bài viết thành công',

  DELETE_FORUM_POST_SUCCESS: 'Xóa bài viết thành công',

  CREATE_FORUM_COMMENT_SUCCESS: 'Gửi bình luận thành công',

  GET_FORUM_COMMENTS_SUCCESS: 'Lấy danh sách bình luận thành công',

  UPDATE_FORUM_COMMENT_SUCCESS: 'Cập nhật bình luận thành công',

  DELETE_FORUM_COMMENT_SUCCESS: 'Xóa bình luận thành công',

  FORUM_POST_NOT_FOUND: 'Không tìm thấy bài viết',

  FORUM_COMMENT_NOT_FOUND: 'Không tìm thấy bình luận',

  FORUM_LABELS_INVALID: 'Cần ít nhất một nhãn hợp lệ',

  FORUM_FORBIDDEN_NOT_AUTHOR: 'Bạn chỉ có thể sửa bài viết của chính mình',

  FORUM_FORBIDDEN_NOT_COMMENT_AUTHOR: 'Bạn chỉ có thể sửa bình luận của chính mình',

  FORUM_ONLY_ADMIN_CAN_CHANGE_STATUS: 'Chỉ quản trị viên mới đổi được trạng thái bài viết',

  FORUM_POST_LOCKED_NO_COMMENTS: 'Bài viết đã khoá; không thể thêm bình luận mới',

  FORUM_PATCH_EMPTY: 'Vui lòng gửi ít nhất một trường cần cập nhật',

  FORUM_IMAGES_INVALID: 'images tối đa 3 ảnh, mỗi ảnh có objectKey và url không rỗng',

  UPLOAD_IMAGES_SUCCESS: 'Tải ảnh lên thành công',

  UPLOAD_IMAGES_REQUIRED: 'Cần ít nhất một tệp (tên trường: images)',

  UPLOAD_SERVICE_NOT_CONFIGURED: 'Dịch vụ tải ảnh chưa được cấu hình',

  UPLOAD_SERVICE_FAILED: 'Dịch vụ tải ảnh trả về lỗi',

  UPLOAD_DOCUMENTS_SUCCESS: 'Tải tài liệu lên thành công',

  UPLOAD_DOCUMENTS_REQUIRED: 'Cần ít nhất một tệp (tên trường: documents)',

  DOCUMENT_UPLOAD_SERVICE_NOT_CONFIGURED: 'Dịch vụ tải tài liệu chưa được cấu hình',

  DOCUMENT_UPLOAD_SERVICE_FAILED: 'Dịch vụ tải tài liệu trả về lỗi',

  DOCUMENT_FILE_TYPE_NOT_ALLOWED: 'Chỉ chấp nhận PDF hoặc ảnh (ví dụ bản quét chứng chỉ VietGAP)',

  CERT_CREATE_SUCCESS: 'Tạo chứng chỉ thành công',

  CERT_UPDATE_SUCCESS: 'Cập nhật chứng chỉ thành công',

  CERT_DELETE_SUCCESS: 'Xóa chứng chỉ thành công',

  CERT_GET_SUCCESS: 'Lấy thông tin chứng chỉ thành công',

  CERT_LIST_SUCCESS: 'Lấy danh sách chứng chỉ thành công',

  CERT_APPROVE_SUCCESS: 'Đã duyệt chứng chỉ',

  CERT_REJECT_SUCCESS: 'Đã từ chối chứng chỉ',

  CERT_REVOKE_SUCCESS: 'Đã thu hồi chứng chỉ',

  CERT_SCOPE_ADD_SUCCESS: 'Đã thêm nông trại vào phạm vi chứng chỉ',

  CERT_SCOPE_REMOVE_SUCCESS: 'Đã gỡ nông trại khỏi phạm vi chứng chỉ',

  CERT_NOT_FOUND: 'Không tìm thấy chứng chỉ',

  CERT_FORBIDDEN: 'Bạn không có quyền truy cập chứng chỉ này',

  CERT_INVALID_STATE: 'Trạng thái chứng chỉ không phù hợp với thao tác này',

  CERT_FILE_URL_REQUIRED: 'Vui lòng nhập file_url',

  CERT_TYPE_INVALID: 'type phải là một trong: vietgap, globalgap, organic, other',

  CERT_EXPIRES_BEFORE_ISSUED: 'expires_at phải sau issued_at',

  CERT_SCOPE_FARM_NOT_MEMBER: 'Nông trại chưa là thành viên được duyệt của HTX này',

  CERT_SCOPE_ALREADY_EXISTS: 'Nông trại đã nằm trong phạm vi chứng chỉ này',

  CERT_SCOPE_NOT_FOUND: 'Nông trại không nằm trong phạm vi chứng chỉ này',

  CERT_FARM_UPLOAD_SUCCESS: 'Đã gửi chứng chỉ nông trại để duyệt',

  CERT_FARM_NOT_FOUND_OR_FORBIDDEN: 'Không tìm thấy nông trại hoặc bạn không phải chủ trại',

  CERT_REJECT_REASON_REQUIRED: 'Vui lòng nhập lý do từ chối (ghi chú gửi nông hộ)',

  CERT_REVOKE_REASON_REQUIRED: 'Vui lòng nhập revoke_reason',

  CHAT_CONVERSATION_CREATED: 'Đã tạo cuộc trò chuyện',

  CHAT_CONVERSATION_OPENED: 'Đã mở cuộc trò chuyện (đã có sẵn)',

  CHAT_CONVERSATIONS_LIST_SUCCESS: 'Lấy danh sách cuộc trò chuyện thành công',

  CHAT_MESSAGES_LIST_SUCCESS: 'Lấy danh sách tin nhắn thành công',

  CHAT_MESSAGE_SENT: 'Đã gửi tin nhắn',
  CHAT_MARK_READ_SUCCESS: 'Đã cập nhật trạng thái đã đọc',

  CHAT_PEER_INVALID: 'Người nhận phải là người dùng khác đang hoạt động (không phải chính bạn)',

  CHAT_CONVERSATION_NOT_FOUND: 'Không tìm thấy cuộc trò chuyện',

  CHAT_FORBIDDEN: 'Bạn không tham gia cuộc trò chuyện này',

  SHOP_SUGGEST_SUCCESS: 'Đã tạo gợi ý gian hàng',
  PRODUCT_LISTING_SUGGEST_SUCCESS: 'Đã tạo gợi ý mô tả & giá',

  CREATE_SHOP_SUCCESS: 'Tạo gian hàng thành công',

  UPDATE_SHOP_SUCCESS: 'Cập nhật gian hàng thành công',

  GET_SHOP_SUCCESS: 'Lấy thông tin gian hàng thành công',

  GET_MY_SHOP_SUCCESS: 'Lấy gian hàng của bạn thành công',

  GET_SHOPS_SUCCESS: 'Lấy danh sách gian hàng thành công',

  SHOP_NOT_FOUND_OR_FORBIDDEN: 'Không tìm thấy gian hàng hoặc bạn không có quyền',

  SHOP_ALREADY_EXISTS_FOR_FARM: 'Nông trại này đã có gian hàng',

  AI_GENERATION_FAILED: 'Tạo nội dung AI thất bại. Vui lòng thử lại sau',

  GET_AVAILABLE_SEASONS_SUCCESS: 'Lấy danh sách mùa vụ khả dụng thành công',

  GET_AVAILABLE_SALE_UNITS_SUCCESS: 'Lấy danh sách lô bán khả dụng thành công',

  ADD_PRODUCT_SUCCESS: 'Thêm sản phẩm thành công',

  SALE_UNIT_NOT_AVAILABLE_FOR_SHOP: 'Lô bán không thuộc nông trại của gian hàng này hoặc không hợp lệ',

  SALE_UNIT_NOT_ACTIVE: 'Lô bán không ở trạng thái đang bán',

  SALE_UNIT_ALREADY_LISTED: 'Lô này đã được đăng bán trên chợ',

  PRODUCT_UNIT_INCOMPATIBLE: 'Đơn vị sản phẩm không tương thích với đơn vị của lô bán',

  PRODUCT_STOCK_EXCEEDS_LOT: 'Tồn kho sản phẩm vượt quá khối lượng còn lại của lô',

  GET_PRODUCTS_SUCCESS: 'Lấy danh sách sản phẩm thành công',

  GET_PRODUCT_DETAIL_SUCCESS: 'Lấy chi tiết sản phẩm thành công',

  PRODUCT_NOT_FOUND: 'Không tìm thấy sản phẩm',

  SEASON_NOT_OWNED_BY_FARMER: 'Mùa vụ không thuộc nông trại của bạn',

  CREATE_ORDER_SUCCESS: 'Tạo đơn hàng thành công',

  GET_ORDERS_SUCCESS: 'Lấy danh sách đơn hàng thành công',

  GET_ORDER_DETAIL_SUCCESS: 'Lấy chi tiết đơn hàng thành công',

  GET_PAYOS_RESUME_SUCCESS: 'Lấy lại link thanh toán PayOS thành công',

  CANCEL_ORDER_SUCCESS: 'Huỷ đơn hàng thành công',

  UPDATE_ORDER_STATUS_SUCCESS: 'Cập nhật trạng thái đơn hàng thành công',

  ORDER_NOT_FOUND: 'Không tìm thấy đơn hàng',

  ORDER_FORBIDDEN: 'Bạn không có quyền truy cập đơn hàng này',

  ORDER_ITEMS_REQUIRED: 'Đơn hàng cần ít nhất một sản phẩm',

  ORDER_ITEMS_SAME_SHOP: 'Mọi sản phẩm trong đơn phải cùng một gian hàng',

  ORDER_PRODUCT_NOT_AVAILABLE: 'Một số sản phẩm không còn khả dụng',

  ORDER_INSUFFICIENT_STOCK: 'Tồn kho không đủ cho một hoặc nhiều sản phẩm',

  ORDER_CANNOT_CANCEL: 'Chỉ có thể huỷ đơn đang chờ xử lý',

  ORDER_CANNOT_CANCEL_AFTER_PAYMENT: 'Đơn đã thanh toán không thể huỷ trên ứng dụng',

  ORDER_INVALID_STATUS_TRANSITION: 'Chuyển trạng thái đơn hàng không hợp lệ',

  ORDER_PAYOS_MIN_AMOUNT: 'Đơn PayOS cần tổng tiền hàng tối thiểu 2.000đ',

  ORDER_PAYOS_LINK_FAILED: 'Không tạo được link thanh toán PayOS. Vui lòng thử lại.',

  ORDER_PAYOS_RESUME_NOT_APPLICABLE: 'Đơn này không thanh toán qua PayOS.',

  ORDER_PAYOS_RESUME_NOT_PENDING: 'Đơn không còn chờ thanh toán PayOS.',

  ORDER_PAYOS_RESUME_NO_CODE: 'Không có mã giao dịch PayOS cho đơn này.',

  ORDER_PAYOS_RESUME_LINK_DEAD:
    'Link thanh toán PayOS đã hủy hoặc hết hạn. Bạn có thể hủy đơn trên app và đặt lại.',

  ORDER_PAYOS_RESUME_FETCH_FAILED:
    'Không lấy lại được thông tin thanh toán từ PayOS. Vui lòng thử lại sau.',

  ORDER_PAYOS_CONFIRM_REQUIRES_PAID: 'Chỉ xác nhận đơn PayOS sau khi khách đã thanh toán',

  FORBIDDEN_NOT_CONSUMER: 'Chỉ tài khoản khách hàng mới đặt hàng được',

  BLOCKCHAIN_NOT_CONFIGURED:

    'Chưa cấu hình neo blockchain (thiếu biến môi trường: SEPOLIA_RPC_URL, ANCHOR_WALLET_PRIVATE_KEY, ANCHOR_CONTRACT_ADDRESS)',

  BLOCKCHAIN_ANCHOR_FAILED: 'Gửi giao dịch neo lên blockchain thất bại',



  CREATE_INSPECTION_SUCCESS: 'Ghi nhận đợt kiểm tra thành công',

  GET_INSPECTIONS_SUCCESS: 'Lấy danh sách đợt kiểm tra thành công',

  DELETE_INSPECTION_SUCCESS: 'Xóa đợt kiểm tra thành công',

  INSPECTION_FORBIDDEN_NOT_MEMBER:

    'Bạn không quản lý nông trại này với tư cách HTX (chưa có liên kết cooperative_member được duyệt)',

  INSPECTION_FORBIDDEN_NOT_OWNER: 'Chỉ kiểm viên HTX tạo đợt kiểm tra này mới được xóa',

  INSPECTION_VERDICT_INVALID: 'verdict phải là một trong: pass, fail, needs_work',

  INSPECTION_SUMMARY_TOO_LONG: 'summary tối đa 2000 ký tự',

  INSPECTION_SEASON_ANCHORED: 'Mùa vụ đã niêm phong, không sửa đợt kiểm tra (thêm đợt mới sau chu kỳ sửa đổi)',



  SALE_UNIT_CREATE_SUCCESS: 'Tạo lô bán thành công',

  SALE_UNIT_LIST_SUCCESS: 'Lấy danh sách lô bán thành công',

  SALE_UNIT_DETAIL_SUCCESS: 'Lấy chi tiết lô bán thành công',

  SALE_UNIT_UPDATE_SUCCESS: 'Cập nhật lô bán thành công',

  SALE_UNIT_DELETE_SUCCESS: 'Xóa lô bán thành công',

  SALE_UNIT_NOT_FOUND: 'Không tìm thấy lô bán',

  SALE_UNIT_SEASON_MUST_BE_ANCHORED: 'Mùa vụ phải niêm phong trước khi tạo lô bán',

  SALE_UNIT_CODE_GENERATION_FAILED: 'Không tạo được mã lô bán duy nhất, vui lòng thử lại',

  SALE_UNIT_SEASON_MISSING_YIELD:

    'Mùa vụ chưa có năng suất thực tế; không thể phân lô cho đến khi ghi nhận tổng thu hoạch',

  SALE_UNIT_UNIT_MISMATCH: 'Đơn vị lô bán phải trùng đơn vị năng suất mùa vụ',

  SALE_UNIT_LOT_UNIT_INVALID: 'Đơn vị lô bán phải là một trong: tấn, kg, gam (g)',

  SALE_UNIT_SEASON_UNIT_NOT_CONVERTIBLE:

    'Đơn vị năng suất mùa vụ phải quy đổi được ra kg (vd. kg, yến, tạ, tấn, g) để phân lô',

  SALE_UNIT_EXCEEDS_ACTUAL_YIELD: 'Số lượng yêu cầu vượt phần năng suất thu hoạch còn lại của mùa vụ',



  SEASON_MISSING_YIELD_FOR_ANCHOR:
    'Cần nhập sản lượng thu hoạch thực tế và đơn vị tính trước khi hoàn thành thu hoạch hoặc đăng nhật ký (neo) mùa vụ',

  /** Khi SEASON_MIN_DIARY_ENTRIES_FOR_SEAL = 1 (mặc định). Không ràng buộc từng loại sự kiện — chỉ cần có bản ghi. */
  SEASON_MIN_DIARY_ENTRIES_FOR_SEAL:
    'Cần ít nhất một bản ghi nhật ký canh tác trước khi hoàn thành thu hoạch hoặc đăng nhật ký (neo) mùa vụ.',



  TRACE_RESOLVE_SUCCESS: 'Tra cứu truy xuất thành công',

  TRACE_DETAIL_SUCCESS: 'Lấy chi tiết truy xuất thành công',

  TRACE_VERIFY_SUCCESS: 'Xác minh truy xuất thành công',

  TRACE_CODE_REQUIRED: 'Vui lòng nhập mã truy xuất',

  TRACE_CODE_NOT_FOUND: 'Không tìm thấy mã truy xuất',



  GET_NOTIFICATIONS_SUCCESS: 'Lấy thông báo thành công',

  MARK_NOTIFICATION_READ_SUCCESS: 'Đã đánh dấu đã đọc',

  MARK_ALL_NOTIFICATIONS_READ_SUCCESS: 'Đã đánh dấu đọc tất cả thông báo',

  NOTIFICATION_NOT_FOUND: 'Không tìm thấy thông báo',



  SHOP_REVIEW_CREATE_SUCCESS: 'Gửi đánh giá thành công',

  SHOP_REVIEW_LIST_SUCCESS: 'Tải danh sách đánh giá thành công',

  SHOP_REVIEW_UPDATE_SUCCESS: 'Cập nhật đánh giá thành công',

  SHOP_REVIEW_RATING_INVALID: 'rating phải là số nguyên từ 1 đến 5',

  SHOP_REVIEW_ORDER_NOT_DELIVERED: 'Chỉ đánh giá được sau khi đơn đã giao',

  SHOP_REVIEW_ALREADY_EXISTS: 'Bạn đã đánh giá sản phẩm này cho đơn hàng này',

  SHOP_REVIEW_PRODUCT_NOT_IN_ORDER: 'Sản phẩm không thuộc đơn hàng',

  SHOP_REVIEW_NOT_FOUND: 'Không tìm thấy đánh giá',

  SHOP_REVIEW_NOTHING_TO_UPDATE: 'Vui lòng gửi ít nhất điểm sao hoặc nội dung để cập nhật',

  ACCOUNT_SUSPENDED:
    'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên nếu cần hỗ trợ.',

  ADMIN_DASHBOARD_SUMMARY_SUCCESS: 'Lấy tổng quan quản trị thành công',

  ADMIN_USERS_LIST_SUCCESS: 'Lấy danh sách người dùng thành công',

  ADMIN_USER_DETAIL_SUCCESS: 'Lấy chi tiết người dùng thành công',

  ADMIN_USER_STATUS_UPDATED: 'Cập nhật trạng thái người dùng thành công',

  ADMIN_USER_STATUS_INVALID: 'Trạng thái phải là active hoặc suspended',

  ADMIN_CANNOT_SUSPEND_LAST_ADMIN: 'Không thể khóa quản trị viên cuối cùng đang hoạt động',

  ADMIN_BROADCAST_SUCCESS: 'Đã gửi thông báo hệ thống',

  ADMIN_BROADCAST_EMPTY_AUDIENCE: 'Không có người nhận phù hợp với đối tượng đã chọn',

  ADMIN_BROADCAST_AUDIENCE_INVALID: 'Đối tượng phải là: all, consumers, farmers, hoặc cooperatives'

} as const



export default USER_MESSAGES

