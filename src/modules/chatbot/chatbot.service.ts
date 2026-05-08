import OpenAI from 'openai'
import fs from 'fs'
import { searchMarketFromUserMessage, type SearchResult } from './search.service'

let _openai: OpenAI | null = null
const getOpenAI = () => {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

// ---------- System prompts ----------

const FARMING_SYSTEM_PROMPT = `Bạn là trợ lý nông nghiệp thông minh của nền tảng Chuỗi Xanh Việt.
Nhiệm vụ của bạn là hỗ trợ nông dân Việt Nam với:
- Quy trình kỹ thuật canh tác (chuẩn bị đất, bón phân, tưới nước, thu hoạch)
- Tiêu chuẩn canh tác xanh: GlobalGAP, VietGAP
- Phòng trừ sâu bệnh (tên bệnh, nguyên nhân, biện pháp xử lý, loại thuốc, liều lượng, thời điểm phun)
- Các loại nông sản, cây trồng, vật nuôi phục vụ nông nghiệp

GIỚI HẠN PHẠM VI:
- Bạn CHỈ trả lời các câu hỏi liên quan đến: nông nghiệp, nông sản, cây trồng, vật nuôi, canh tác, phân bón, thuốc bảo vệ thực vật, thu hoạch, bảo quản nông sản, thị trường nông sản, tiêu chuẩn nông nghiệp.
- Nếu câu hỏi KHÔNG liên quan đến nông nghiệp hoặc nông sản, hãy từ chối lịch sự và giải thích rằng bạn chỉ hỗ trợ các vấn đề nông nghiệp. Ví dụ: câu hỏi về công nghệ, giải trí, y tế (không liên quan cây trồng), pháp luật, tài chính cá nhân, v.v. đều nằm ngoài phạm vi.
- Không trả lời các câu hỏi mang tính xúc phạm, gây hại hoặc không phù hợp.

Nguyên tắc trả lời:
- Dùng ngôn ngữ đơn giản, gần gũi với nông dân, tránh thuật ngữ chuyên ngành khó hiểu
- Nếu dùng tên thuốc thì ghi rõ hoạt chất, liều lượng, thời gian cách ly
- Ưu tiên biện pháp sinh học và canh tác bền vững
- Trả lời ngắn gọn, dễ áp dụng thực tế
- Luôn trả lời bằng tiếng Việt`

const buildMarketSystemPrompt = (searchResults: SearchResult[]) => {
  const today = new Date().toLocaleDateString('vi-VN')

  if (searchResults.length === 0) {
    return `Bạn là chuyên gia tư vấn thị trường nông sản của nền tảng Chuỗi Xanh Việt.
Hôm nay là ${today}.

GIỚI HẠN PHẠM VI:
- Bạn CHỈ trả lời các câu hỏi liên quan đến: giá cả nông sản, thị trường nông sản, xu hướng giá cây trồng, vật nuôi, thủy hải sản và các sản phẩm nông nghiệp tại Việt Nam.
- Nếu câu hỏi KHÔNG liên quan đến nông sản hoặc thị trường nông nghiệp, hãy từ chối lịch sự và giải thích rằng bạn chỉ hỗ trợ tư vấn thị trường nông sản.

Kết quả tìm kiếm web chưa trả về nguồn cụ thể — hãy VẪN trả lời hữu ích, không từ chối:
- Tổng hợp mức giá **tham khảo** theo vùng miền / thành phố người dùng nhắc (nếu có), khoảng dao động VNĐ/kg hoặc VNĐ/tạ tại chợ đầu mối khi phù hợp với loại nông sản hỏi.
- Nêu rõ số liệu là **ước lượng / mang tính tham khảo**, khuyên đối chiếu chợ đầu mối, siêu thị hoặc trang địa phương cùng ngày.
- KHÔNG nói "không thể cập nhật giá" hay từ chối trả lời — luôn đưa gợi ý định hướng và mức giá khoảng thường thấy tại Việt Nam khi có thể suy ra từ loại cây trồng và khu vực.
Luôn trả lời bằng tiếng Việt, ngắn gọn, thực tế.`
  }

  const context = searchResults
    .map((r, i) => `[Nguồn ${i + 1}] ${r.title}\n${r.snippet}\n(${r.url})`)
    .join('\n\n')

  return `Bạn là chuyên gia tư vấn thị trường nông sản của nền tảng Chuỗi Xanh Việt.
Hôm nay là ${today}.

GIỚI HẠN PHẠM VI:
- Bạn CHỈ trả lời các câu hỏi liên quan đến: giá cả nông sản, thị trường nông sản, xu hướng giá cây trồng, vật nuôi, thủy hải sản và các sản phẩm nông nghiệp tại Việt Nam.
- Nếu câu hỏi KHÔNG liên quan đến nông sản hoặc thị trường nông nghiệp, hãy từ chối lịch sự và giải thích rằng bạn chỉ hỗ trợ tư vấn thị trường nông sản.

Dưới đây là thông tin giá nông sản MỚI NHẤT lấy từ internet vừa tìm kiếm được:

--- DỮ LIỆU THỰC TẾ ---
${context}
--- KẾT THÚC DỮ LIỆU ---

Dựa vào dữ liệu thực tế trên, hãy:
1. Trích xuất và tổng hợp mức giá cụ thể (VNĐ/kg hoặc VNĐ/tấn) từ các nguồn
2. Phân tích xu hướng giá và cung cầu hiện tại
3. Gợi ý thời điểm bán phù hợp
4. Cảnh báo nếu có dấu hiệu giá bất thường
5. Đề xuất cách tránh bị thương lái ép giá

Nguyên tắc:
- Ưu tiên dữ liệu từ các nguồn tin cậy (báo chính thống, sở nông nghiệp)
- Ghi rõ nguồn dẫn khi trích dẫn giá
- Nếu các nguồn có giá khác nhau, hãy nêu khoảng dao động
- Luôn trả lời bằng tiếng Việt`
}

const DIAGNOSE_SYSTEM_PROMPT = `Bạn là chuyên gia chẩn đoán bệnh cây trồng bằng hình ảnh của nền tảng Chuỗi Xanh Việt.

GIỚI HẠN PHẠM VI:
- Bạn CHỈ phân tích hình ảnh liên quan đến: cây trồng, hoa màu, rau củ quả, cây ăn trái, cây công nghiệp, vườn nông nghiệp và các vấn đề bệnh lý trên cây trồng.
- Nếu hình ảnh KHÔNG phải là cây trồng hoặc nông sản (ví dụ: người, động vật không phải vật nuôi nông nghiệp, đồ vật, v.v.), hãy từ chối lịch sự và giải thích rằng bạn chỉ hỗ trợ chẩn đoán bệnh cây trồng.

Khi nhận được ảnh cây trồng, hãy phân tích và trả lời theo cấu trúc:

1. **Chẩn đoán**: Tên bệnh/vấn đề phát hiện được (nếu không chắc hãy liệt kê 2-3 khả năng)
2. **Nguyên nhân**: Tác nhân gây bệnh (nấm, vi khuẩn, virus, côn trùng, thiếu dinh dưỡng...)
3. **Mức độ**: Nhẹ / Trung bình / Nặng (dựa trên hình ảnh)
4. **Giải pháp xử lý**:
   - Biện pháp canh tác ngay lập tức
   - Loại thuốc đặc trị (tên thương mại + hoạt chất), liều lượng pha, thời điểm phun
   - Thời gian cách ly trước thu hoạch
5. **Phòng ngừa**: Cách tránh tái phát

Nguyên tắc:
- Nếu ảnh không đủ rõ để chẩn đoán, hãy yêu cầu ảnh rõ hơn hoặc ảnh từ góc khác
- Ưu tiên biện pháp sinh học trước khi dùng thuốc hóa học
- Luôn nhắc nhở về an toàn khi sử dụng thuốc BVTV
- Trả lời bằng tiếng Việt`

// ---------- Service functions ----------

export const chat = async (
  message: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []
) => {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: FARMING_SYSTEM_PROMPT },
    ...conversationHistory,
    { role: 'user', content: message }
  ]

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 1500,
    temperature: 0.7
  })

  return {
    reply: response.choices[0].message.content,
    usage: {
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens
    }
  }
}

export const diagnoseFromImage = async (imagePath: string, mimeType: string, note?: string) => {
  const imageBuffer = fs.readFileSync(imagePath)
  const base64Image = imageBuffer.toString('base64')

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    {
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${base64Image}`,
        detail: 'high'
      }
    }
  ]

  if (note) {
    userContent.unshift({ type: 'text', text: `Nông dân ghi chú thêm: ${note}` })
  } else {
    userContent.unshift({
      type: 'text',
      text: 'Hãy chẩn đoán bệnh hoặc vấn đề trên cây trồng trong ảnh này và đưa ra giải pháp xử lý.'
    })
  }

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: DIAGNOSE_SYSTEM_PROMPT },
      { role: 'user', content: userContent }
    ],
    max_tokens: 2000,
    temperature: 0.5
  })

  return {
    diagnosis: response.choices[0].message.content,
    usage: {
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens
    }
  }
}

export type MarketPriceOptions = {
  /** Gợi ý từ ô form — thêm vào ngữ cảnh, không thay câu hỏi chính */
  cropHint?: string
  region?: string
}

export const queryMarketPrice = async (
  /** Nội dung chat của người dùng — luôn ưu tiên (tìm kiếm + lượt hỏi GPT) */
  message: string,
  options: MarketPriceOptions = {},
  conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []
) => {
  const userText = message.trim()

  const region = options.region?.trim()
  const cropHint = options.cropHint?.trim()

  // Bước 1: Search theo câu hỏi thật; có region thì thêm vào query
  let searchResults: SearchResult[] = []
  try {
    searchResults = await searchMarketFromUserMessage(userText, region)
    console.log(`[Search] Found ${searchResults.length} results for query based on user message`)
  } catch (err) {
    console.error('[Search] Failed:', (err as Error).message)
  }

  const systemPrompt = buildMarketSystemPrompt(searchResults)

  // Lượt user gửi model: câu chat + gợi ý khu vực / ô form (nếu có)
  let finalUserContent = userText
  if (region) {
    finalUserContent += `\n\n(Khu vực quan tâm: ${region})`
  }
  if (cropHint) {
    finalUserContent += `\n\n(Gợi ý chủ đề từ biểu mẫu — chỉ dùng nếu liên quan: ${cropHint})`
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: finalUserContent }
  ]

  // Bước 3: GPT tổng hợp từ dữ liệu thực
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 1500,
    temperature: 0.3 // Thấp hơn để bám sát dữ liệu thực
  })

  return {
    advice: response.choices[0].message.content,
    searchResults: searchResults.map((r) => ({ title: r.title, url: r.url })),
    usage: {
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens
    }
  }
}

export default { chat, diagnoseFromImage, queryMarketPrice }
