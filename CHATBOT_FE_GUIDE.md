# Hướng dẫn implement màn hình Chatbot - Chuỗi Xanh Việt

## Tổng quan

Màn hình chatbot có 4 chế độ riêng biệt, mỗi chế độ gọi một API endpoint khác nhau.
Tất cả đều yêu cầu `Authorization: Bearer <accessToken>`.

---

## 1. Cấu trúc API (Base URL: /chatbot)

### Chế độ 1 — Tư vấn kỹ thuật canh tác

- **Endpoint:** `POST /chatbot/chat`
- **Body:**
  ```json
  {
    "message": "string",
    "conversationHistory": [{ "role": "user" | "assistant", "content": "string" }]
  }
  ```
- **Response:**
  ```json
  { "data": { "reply": "string (markdown)", "usage": {} } }
  ```

### Chế độ 2 — Chẩn đoán bệnh cây qua ảnh

- **Endpoint:** `POST /chatbot/diagnose`
- **Body:** `multipart/form-data`
  - `image`: file JPG / PNG / WebP, tối đa 10MB (bắt buộc)
  - `note`: string mô tả thêm (tuỳ chọn)
- **Response:**
  ```json
  { "data": { "diagnosis": "string (markdown)", "usage": {} } }
  ```
- **Lưu ý:** Không có conversation history — mỗi lần gửi ảnh là độc lập

### Chế độ 3 — Tư vấn giá thị trường nông sản

- **Endpoint:** `POST /chatbot/market`
- **Body:**
  ```json
  {
    "message": "string",
    "crop": "string (tuỳ chọn)",
    "region": "string (tuỳ chọn)",
    "conversationHistory": [...]
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "advice": "string (markdown)",
      "sources": [{ "title": "string", "url": "string" }],
      "usage": {}
    }
  }
  ```

### Chế độ 4 — Hướng dẫn sử dụng ứng dụng

- **Endpoint:** `POST /chatbot/guide`
- **Body:**
  ```json
  {
    "message": "string",
    "conversationHistory": [...]
  }
  ```
- **Response:**
  ```json
  {
    "data": {
      "reply": "string (markdown)",
      "matchedSections": ["string"],
      "usage": {}
    }
  }
  ```
- **Lưu ý:** `matchedSections` là mảng tên các mục tài liệu đã dùng để tạo câu trả lời (hiển thị phụ nếu muốn)

---

## 2. Yêu cầu UI: Thanh chọn chế độ (ở TRÊN cùng, trước khu vực chat)

Hiển thị 4 thẻ/nút chọn chế độ ở đầu màn hình. Khi đổi chế độ: **reset conversation history** và cập nhật placeholder input.

```
┌────────────────────────────────────────────────────────────────┐
│  🌱 Trồng trọt  │  🔬 Chẩn đoán  │  📈 Thị trường  │  📖 Hướng dẫn  │
└────────────────────────────────────────────────────────────────┘
```

| Icon | Nhãn       | Mô tả ngắn                            | API endpoint        |
|------|------------|----------------------------------------|---------------------|
| 🌱   | Trồng trọt | Kỹ thuật canh tác, phân bón, VietGAP  | `POST /chatbot/chat`    |
| 🔬   | Chẩn đoán  | Nhận diện bệnh cây qua ảnh            | `POST /chatbot/diagnose`|
| 📈   | Thị trường | Giá nông sản hôm nay                  | `POST /chatbot/market`  |
| 📖   | Hướng dẫn  | Cách dùng ứng dụng                    | `POST /chatbot/guide`   |

**Placeholder input theo từng chế độ:**

| Chế độ     | Placeholder                                    |
|------------|------------------------------------------------|
| Trồng trọt | `Hỏi về kỹ thuật trồng, bón phân, sâu bệnh...`|
| Chẩn đoán  | `Thêm ghi chú về triệu chứng (tuỳ chọn)...`   |
| Thị trường | `VD: Giá lúa tại An Giang hôm nay?`           |
| Hướng dẫn  | `VD: Làm sao để tạo vụ mùa mới?`              |

---

## 3. Render Markdown (BẮT BUỘC)

Tất cả field `reply`, `diagnosis`, `advice` từ API đều là **Markdown string**. Phải render đúng — không được hiển thị ký tự `**`, `###`, `-` thô ra màn hình.

### Các pattern Markdown cần xử lý:

| Markdown input    | Hiển thị mong muốn           |
|-------------------|------------------------------|
| `**text**`        | **text** (in đậm)            |
| `*text*`          | *text* (in nghiêng)          |
| `### Tiêu đề`     | Tiêu đề cỡ lớn               |
| `## Tiêu đề`      | Tiêu đề cỡ vừa               |
| `- item`          | • item (bullet list)         |
| `1. item`         | 1. item (numbered list)      |
| `` `code` ``      | `code` (monospace highlight) |
| `> Lưu ý: ...`   | Blockquote / chú thích       |

### Cách implement — React Native

**Cách 1: Dùng thư viện (khuyến nghị)**

```bash
npm install react-native-markdown-display
```

```tsx
import Markdown from 'react-native-markdown-display';

const markdownStyles = {
  body: { fontSize: 14, color: '#1a1a1a', lineHeight: 22 },
  heading2: { fontSize: 16, fontWeight: 'bold', marginTop: 12 },
  heading3: { fontSize: 15, fontWeight: '600', marginTop: 8 },
  strong: { fontWeight: 'bold' },
  bullet_list: { marginLeft: 8 },
};

// Dùng trong component:
<Markdown style={markdownStyles}>{reply}</Markdown>
```

**Cách 2: Parse thủ công (nếu không muốn thêm thư viện)**

```tsx
import { Text, View } from 'react-native';

function MarkdownText({ content }: { content: string }) {
  return (
    <View>
      {content.split('\n').map((line, i) => {
        // Heading
        if (line.startsWith('### ')) return <Text key={i} style={{ fontWeight: 'bold', fontSize: 15, marginTop: 8 }}>{line.slice(4)}</Text>;
        if (line.startsWith('## '))  return <Text key={i} style={{ fontWeight: 'bold', fontSize: 16, marginTop: 10 }}>{line.slice(3)}</Text>;
        // Bullet
        if (line.startsWith('- '))   return <Text key={i} style={{ marginLeft: 12 }}>{'• ' + renderBold(line.slice(2))}</Text>;
        // Numbered list
        if (/^\d+\. /.test(line))    return <Text key={i} style={{ marginLeft: 12 }}>{renderBold(line)}</Text>;
        // Blockquote
        if (line.startsWith('> '))   return <Text key={i} style={{ color: '#555', borderLeftWidth: 3, paddingLeft: 8 }}>{line.slice(2)}</Text>;
        // Normal line
        return <Text key={i}>{renderBold(line)}</Text>;
      })}
    </View>
  );
}

// Xử lý **bold** trong một dòng
function renderBold(line: string) {
  const parts = line.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <Text key={i} style={{ fontWeight: 'bold' }}>{part}</Text>
      : <Text key={i}>{part}</Text>
  );
}
```

### Cách implement — React Web

```bash
npm install react-markdown
```

```tsx
import ReactMarkdown from 'react-markdown';

<ReactMarkdown className="prose prose-sm">{reply}</ReactMarkdown>
```

---

## 4. Chế độ Chẩn đoán — UI upload ảnh

Chế độ `diagnose` dùng ảnh thay cho text input. Layout gợi ý:

```
┌──────────────────────────────────────────┐
│                                          │
│   [📷 Chụp ảnh]   [🖼️ Chọn từ thư viện]  │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │         (preview ảnh)            │   │
│   └──────────────────────────────────┘   │
│                                          │
│   Ghi chú thêm (tuỳ chọn):              │
│   ┌──────────────────────────────────┐   │
│   │ VD: Lá bị vàng từ 3 ngày trước  │   │
│   └──────────────────────────────────┘   │
│                                          │
│         [🔬 Gửi để chẩn đoán]            │
└──────────────────────────────────────────┘
```

**Cách gọi API:**

```ts
const formData = new FormData();
formData.append('image', {
  uri: imageUri,
  name: 'plant.jpg',
  type: 'image/jpeg',
} as any);
if (note.trim()) formData.append('note', note.trim());

const response = await axios.post('/chatbot/diagnose', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
// Render response.data.data.diagnosis bằng Markdown
```

---

## 5. Chế độ Thị trường — Hiển thị nguồn tham khảo

Sau khi render `advice` (Markdown), nếu `sources.length > 0`, hiển thị thêm phần nguồn:

```
─────────────────────────────
📎 Nguồn tham khảo:
  • Tên nguồn 1  ↗
  • Tên nguồn 2  ↗
```

```tsx
{sources.length > 0 && (
  <View style={{ marginTop: 12, borderTopWidth: 1, paddingTop: 8 }}>
    <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>📎 Nguồn tham khảo:</Text>
    {sources.map((s, i) => (
      <TouchableOpacity key={i} onPress={() => Linking.openURL(s.url)}>
        <Text style={{ color: '#2e7d32' }}>• {s.title} ↗</Text>
      </TouchableOpacity>
    ))}
  </View>
)}
```

---

## 6. Conversation History — duy trì ngữ cảnh đa lượt

Các chế độ `chat`, `market`, `guide` hỗ trợ hội thoại nhiều lượt. Cần lưu và truyền lịch sử.

```ts
const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

async function sendMessage(message: string) {
  const newHistory = [...history, { role: 'user' as const, content: message }];

  const res = await api.post('/chatbot/chat', {
    message,
    conversationHistory: newHistory,
  });

  const assistantReply = res.data.data.reply;

  setHistory([...newHistory, { role: 'assistant', content: assistantReply }]);
}

// Khi đổi chế độ chatbot:
function switchMode(mode: ChatMode) {
  setHistory([]);       // reset lịch sử
  setMessages([]);      // reset UI messages
  setCurrentMode(mode);
}
```

---

## 7. Checklist triển khai

- [ ] Thanh chọn chế độ hiển thị ở trên cùng với 4 tab (Trồng trọt, Chẩn đoán, Thị trường, Hướng dẫn)
- [ ] Đổi chế độ → reset conversation history và messages
- [ ] Tất cả text từ API (`reply`, `diagnosis`, `advice`) được render qua Markdown, không hiển thị `**` thô
- [ ] Chế độ Chẩn đoán có UI chọn ảnh, gửi `multipart/form-data`, không có conversation history
- [ ] Chế độ Thị trường hiển thị danh sách `sources` bên dưới nội dung trả lời
- [ ] Hiện loading spinner khi chờ API (chat/market/guide ~2–5s, diagnose ~5–10s)
- [ ] Xử lý lỗi: API 400/422 → hiện toast "Vui lòng nhập nội dung hợp lệ"
- [ ] Header `Authorization: Bearer <accessToken>` cho mọi request

---

## 8. Thời gian phản hồi API dự kiến

| Chế độ        | Model sử dụng   | Thời gian ước tính |
|---------------|-----------------|---------------------|
| Trồng trọt    | gpt-4o-mini     | 2 – 4 giây          |
| Chẩn đoán     | gpt-4o (vision) | 5 – 10 giây         |
| Thị trường    | gpt-4o-mini     | 3 – 6 giây (có web search) |
| Hướng dẫn     | gpt-4o-mini     | 2 – 4 giây          |
