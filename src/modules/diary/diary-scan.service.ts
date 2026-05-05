import OpenAI from 'openai'
import { Prisma } from '@prisma/client'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import prisma from '~/lib/prisma'
import { ErrorWithStatus } from '~/models/Errors'

export type ScanSeverity = 'info' | 'warning' | 'critical'
export type OverallRisk = 'safe' | 'warning' | 'critical'

export interface ScanViolation {
  severity: ScanSeverity
  code: string
  title: string
  detail: string
  relatedEntryIds: string[]
  recommendation: string
}

export interface DiaryScanResult {
  seasonId: string
  scannedAt: string
  overallRisk: OverallRisk
  violations: ScanViolation[]
  summary: string
}

const SCAN_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    overallRisk: { type: 'string', enum: ['safe', 'warning', 'critical'] },
    violations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['info', 'warning', 'critical'] },
          code: { type: 'string' },
          title: { type: 'string' },
          detail: { type: 'string' },
          relatedEntryIds: { type: 'array', items: { type: 'string' } },
          recommendation: { type: 'string' }
        },
        required: ['severity', 'code', 'title', 'detail', 'relatedEntryIds', 'recommendation'],
        additionalProperties: false
      }
    },
    summary: { type: 'string' }
  },
  required: ['overallRisk', 'violations', 'summary'],
  additionalProperties: false
}

const SYSTEM_PROMPT = `Bạn là chuyên gia kiểm tra an toàn thực phẩm và VietGAP của nền tảng Chuỗi Xanh Việt.

Nhiệm vụ: Phân tích nhật ký canh tác của một vụ mùa và phát hiện các vi phạm hoặc dấu hiệu bất thường.

Các loại vi phạm cần kiểm tra (CHỈ dùng đúng các mã này, không tự tạo mã mới):

1. PHI_VIOLATION - Phun thuốc BVTV quá gần ngày thu hoạch
   - Ngày thu hoạch tham chiếu = harvestStartDate nếu có, ngược lại lấy date của entry harvesting sớm nhất
   - Với mỗi entry pesticide: tính daysBeforeHarvest = (ngày thu hoạch) - (date của entry đó), tính bằng số ngày
   - Nếu daysBeforeHarvest < 14: PHI_VIOLATION severity "warning" (thuốc không rõ tên hoặc nhóm thông thường)
   - Nếu daysBeforeHarvest < 21 và thuốc thuộc nhóm lân hữu cơ/clo hữu cơ: PHI_VIOLATION severity "critical"
   - daysBeforeHarvest = 0 (cùng ngày) hoặc âm (sau thu hoạch) đều là vi phạm nghiêm trọng

2. BANNED_PESTICIDE - Sử dụng thuốc BVTV bị cấm tại Việt Nam (Thông tư 10/2020/TT-BNNPTNT)
   - Hoạt chất bị cấm: Monocrotophos, Methamidophos, Endosulfan, Carbofuran, Methyl parathion, Dichlorvos, Paraquat, Trichlorfon, Phosphamidon, v.v.
   - Vi phạm này luôn là severity = "critical"

3. EXCESSIVE_PESTICIDE_FREQUENCY - Tần suất phun thuốc bất thường
   - Phun thuốc (event_type = pesticide) hơn 4 lần trong vòng 14 ngày liên tiếp
   - Bón phân (fertilizing) trong vòng 7 ngày trước ngày thu hoạch tham chiếu

4. SUSPICIOUS_DIARY_PATTERN - Dấu hiệu nhập liệu gian lận
   - Nhiều bản ghi có event_date trải dài nhiều tháng nhưng server_timestamp (recordedAt) chênh nhau dưới 1 ngày
   - Không có bất kỳ bản ghi nào trong hơn 45 ngày liên tiếp giữa vụ

5. MISSING_KEY_ACTIVITY - Thiếu bước kỹ thuật quan trọng
   - Toàn bộ nhật ký không có sowing (gieo hạt) nhưng có harvesting
   - Vụ lúa/ngô/rau không có bất kỳ fertilizing (bón phân) nào

Nguyên tắc phán xét:
- Chỉ dùng đúng 5 mã vi phạm trên. KHÔNG tự tạo mã vi phạm mới ngoài danh sách.
- Nếu entries có đủ sowing, fertilizing, pesticide, harvesting thì KHÔNG báo MISSING_KEY_ACTIVITY — dù tất cả cùng ngày.
- Khi tất cả entries cùng ngày: ưu tiên kiểm tra PHI_VIOLATION (pesticide cùng ngày với harvest = 0 ngày = vi phạm).
- Chỉ đánh severity = "critical" khi có bằng chứng RÕ RÀNG trong nhật ký
- Đánh severity = "info" khi mô tả mơ hồ hoặc không đủ thông tin để kết luận
- Nếu không có vi phạm: violations = [] và overallRisk = "safe"
- overallRisk = "critical" nếu có ít nhất một violation severity "critical"
- overallRisk = "warning" nếu có violation severity "warning" nhưng không có "critical"
- overallRisk = "safe" nếu chỉ có "info" hoặc không có violation nào
- Tất cả text giải thích phải bằng tiếng Việt, dễ hiểu với nông dân
- relatedEntryIds phải là mảng các id entry từ dữ liệu được cung cấp (hoặc mảng rỗng nếu không xác định entry cụ thể)

Hướng dẫn viết nội dung từng trường:

- detail: Mô tả cụ thể vấn đề phát hiện được — nêu rõ ngày tháng, loại hoạt động, tên thuốc/phân bón (nếu có), và tại sao đây là vấn đề. Ví dụ: "Ngày 15/03, ghi nhận phun thuốc Paraquat — đây là hoạt chất bị cấm theo Thông tư 10/2020/TT-BNNPTNT do gây hại nghiêm trọng cho sức khỏe và môi trường."

- recommendation: Đưa ra hành động cụ thể mà nông dân cần thực hiện để khắc phục hoặc phòng tránh vi phạm này trong tương lai. Ví dụ: "Ngừng ngay việc sử dụng Paraquat và tiêu hủy lượng thuốc còn lại theo đúng quy định. Tham khảo danh sách thuốc BVTV được phép sử dụng tại địa phương trước khi mua thuốc mới."

- summary: Viết đánh giá tổng quan về toàn bộ vụ mùa — bao gồm: (1) nhận xét chung về chất lượng ghi chép nhật ký, (2) những điểm canh tác tốt cần phát huy, (3) tóm tắt các vấn đề nổi bật cần chú ý, và (4) khuyến nghị chung để cải thiện. Viết thành đoạn văn liền mạch, 3-5 câu, không dùng gạch đầu dòng.`

let _openai: OpenAI | null = null
const getOpenAI = () => {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function toDateVN(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${d}/${m}/${date.getFullYear()}`
}

type EntryForSeq = { id: string; event_type: string; event_date: Date }

function computeSequenceViolations(entries: EntryForSeq[]): ScanViolation[] {
  const violations: ScanViolation[] = []

  const byType = (t: string) => entries.filter((e) => e.event_type === t)
  const earliest = (arr: EntryForSeq[]) =>
    arr.length === 0 ? null : arr.reduce((m, e) => (e.event_date < m.event_date ? e : m))

  const firstSowing = earliest(byType('sowing'))
  const firstHarvesting = earliest(byType('harvesting'))
  const firstPacking = earliest(byType('packing'))

  if (firstHarvesting && firstSowing && firstHarvesting.event_date < firstSowing.event_date) {
    violations.push({
      severity: 'critical',
      code: 'SEQUENCE_VIOLATION',
      title: 'Sai trình tự kỹ thuật canh tác',
      detail: `Ghi nhận thu hoạch ngày ${toDateVN(firstHarvesting.event_date)} xảy ra trước khi gieo hạt ngày ${toDateVN(firstSowing.event_date)}.`,
      relatedEntryIds: [firstHarvesting.id, firstSowing.id],
      recommendation:
        'Kiểm tra và đính chính lại ngày tháng trong nhật ký. Trình tự đúng: gieo hạt → chăm sóc → thu hoạch.'
    })
  }

  if (firstPacking && firstHarvesting && firstPacking.event_date < firstHarvesting.event_date) {
    violations.push({
      severity: 'critical',
      code: 'SEQUENCE_VIOLATION',
      title: 'Sai trình tự kỹ thuật canh tác',
      detail: `Ghi nhận đóng gói ngày ${toDateVN(firstPacking.event_date)} xảy ra trước khi thu hoạch ngày ${toDateVN(firstHarvesting.event_date)}.`,
      relatedEntryIds: [firstPacking.id, firstHarvesting.id],
      recommendation: 'Kiểm tra và đính chính lại ngày tháng. Trình tự đúng: thu hoạch trước, đóng gói sau.'
    })
  }

  if (firstSowing && firstHarvesting && firstHarvesting.event_date >= firstSowing.event_date) {
    const diffDays = Math.floor(
      (firstHarvesting.event_date.getTime() - firstSowing.event_date.getTime()) / 86_400_000
    )
    if (diffDays < 30) {
      violations.push({
        severity: 'warning',
        code: 'SEQUENCE_VIOLATION',
        title: 'Thời gian canh tác bất thường',
        detail: `Thời gian từ gieo hạt (${toDateVN(firstSowing.event_date)}) đến thu hoạch (${toDateVN(firstHarvesting.event_date)}) chỉ ${diffDays} ngày — ngắn hơn mức tối thiểu thông thường (30 ngày).`,
        relatedEntryIds: [firstSowing.id, firstHarvesting.id],
        recommendation:
          'Xác nhận lại ngày tháng gieo hạt và thu hoạch. Nếu đúng, bổ sung ghi chú giải thích lý do thu hoạch sớm.'
      })
    }
  }

  return violations
}

class DiaryScanService {
  private async ensureCanScan({ userId, seasonId }: { userId: string; seasonId: string }) {
    const season = await prisma.seasons.findUnique({
      where: { id: seasonId },
      select: {
        id: true,
        farm_id: true,
        crop_name: true,
        start_date: true,
        harvest_start_date: true,
        harvest_end_date: true,
        status: true,
        farms: {
          select: { owner_user_id: true }
        }
      }
    })

    if (season == null) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: USER_MESSAGES.SEASON_NOT_FOUND })
    }

    if (season.farms.owner_user_id === userId) return season

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (user?.role === 'admin') return season

    if (user?.role === 'cooperative') {
      const membership = await prisma.cooperative_members.findFirst({
        where: { cooperative_user_id: userId, farm_id: season.farm_id, status: 'approved' },
        select: { id: true }
      })
      if (membership != null) return season
    }

    throw new ErrorWithStatus({ status: HTTP_STATUS.FORBIDDEN, message: USER_MESSAGES.FARM_NOT_FOUND_OR_FORBIDDEN })
  }

  scanSeason = async ({ userId, seasonId }: { userId: string; seasonId: string }): Promise<DiaryScanResult> => {
    const season = await this.ensureCanScan({ userId, seasonId })

    // Fetch entries, take extra to account for filtering out previous scan results
    const rawEntries = await prisma.diary_entries.findMany({
      where: { season_id: seasonId },
      orderBy: { event_date: 'asc' },
      take: 250,
      select: {
        id: true,
        event_type: true,
        event_date: true,
        server_timestamp: true,
        description: true,
        extra_data: true
      }
    })

    // Exclude previously saved AI scan result entries from analysis
    const entries = rawEntries
      .filter((e) => {
        if (e.event_type !== 'other') return true
        const extra = e.extra_data as Record<string, unknown> | null
        return extra?.type !== 'ai_scan_result'
      })
      .slice(0, 200)

    if (entries.length === 0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.DIARY_SCAN_NO_ENTRIES
      })
    }

    const userPrompt = JSON.stringify(
      {
        season: {
          cropName: season.crop_name,
          startDate: toDateStr(season.start_date),
          harvestStartDate: season.harvest_start_date ? toDateStr(season.harvest_start_date) : null,
          harvestEndDate: season.harvest_end_date ? toDateStr(season.harvest_end_date) : null,
          today: toDateStr(new Date())
        },
        entries: entries.map((e) => ({
          id: e.id,
          date: toDateStr(e.event_date),
          recordedAt: toDateStr(e.server_timestamp),
          type: e.event_type,
          note: e.description ?? ''
        }))
      },
      null,
      0
    )

    let raw: string | null = null
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'diary_scan_result',
            strict: true,
            schema: SCAN_JSON_SCHEMA
          }
        },
        temperature: 0.1
      })
      raw = completion.choices[0]?.message.content ?? null
    } catch (err) {
      console.error('[DiaryScan] OpenAI call failed:', err)
      throw new ErrorWithStatus({
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: USER_MESSAGES.AI_GENERATION_FAILED
      })
    }

    if (!raw) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: USER_MESSAGES.AI_GENERATION_FAILED
      })
    }

    let aiResult: { overallRisk: OverallRisk; violations: ScanViolation[]; summary: string }
    try {
      aiResult = JSON.parse(raw)
    } catch {
      console.error('[DiaryScan] Failed to parse OpenAI response:', raw)
      throw new ErrorWithStatus({
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: USER_MESSAGES.AI_GENERATION_FAILED
      })
    }

    // Replace AI sequence checks with programmatic ones to avoid date comparison errors
    const seqViolations = computeSequenceViolations(entries)
    const mergedViolations = [
      ...aiResult.violations.filter((v) => v.code !== 'SEQUENCE_VIOLATION'),
      ...seqViolations
    ]
    const overallRisk: OverallRisk = mergedViolations.some((v) => v.severity === 'critical')
      ? 'critical'
      : mergedViolations.some((v) => v.severity === 'warning')
        ? 'warning'
        : 'safe'
    const result = { overallRisk, violations: mergedViolations, summary: aiResult.summary }

    const scannedAt = new Date().toISOString()

    // Persist result as diary entry (skip for anchored seasons — they cannot be modified)
    if (season.status !== 'anchored') {
      await prisma.diary_entries.create({
        data: {
          season_id: seasonId,
          farm_id: season.farm_id,
          actor_user_id: userId,
          event_type: 'other',
          event_date: new Date(),
          description: 'Kết quả kiểm tra AI tự động',
          extra_data: {
            type: 'ai_scan_result',
            scannedAt,
            overallRisk: result.overallRisk,
            violations: result.violations as unknown as Prisma.InputJsonValue,
            summary: result.summary
          } as Prisma.InputJsonValue
        }
      })
    }

    return {
      seasonId,
      scannedAt,
      overallRisk: result.overallRisk,
      violations: result.violations,
      summary: result.summary
    }
  }
}

const diaryScanService = new DiaryScanService()
export default diaryScanService
