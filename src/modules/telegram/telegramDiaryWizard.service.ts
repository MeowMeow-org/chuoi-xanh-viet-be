import prisma from '~/lib/prisma'
import diaryService from '~/modules/diary/diary.service'
import seasonService from '~/modules/season/season.service'
import {
  editTelegramMessageTextWithInlineKeyboardUsingBotToken,
  editTelegramMessageTextUsingBotToken,
  getTelegramFileUrlUsingBotToken,
  sendTelegramInlineKeyboardUsingBotToken,
  sendTelegramQuickActionsMenuUsingBotToken,
  sendTelegramTextUsingBotToken
} from './telegramBot.service'
import { transcribeTelegramVoiceToText } from './telegramVoice.service'

type WizardStep =
  | 'awaiting_season'
  | 'awaiting_event_type'
  | 'awaiting_description'
  | 'awaiting_description_confirm'
  | 'awaiting_photos'
  | 'awaiting_new_season_farm'
  | 'awaiting_new_season_crop'
  | 'awaiting_new_season_start_date'
  | 'awaiting_new_season_harvest_start'
  | 'awaiting_new_season_estimated_yield'
  | 'awaiting_new_season_confirm'
  | 'awaiting_confirm'

type SeasonChoice = { seasonId: string; farmId: string; label: string }
type FarmChoice = { farmId: string; label: string }
type CalendarField = 'start' | 'harvest'

type WizardDraft = {
  seasonChoices?: SeasonChoice[]
  seasonId?: string
  farmId?: string
  eventType?: 'land_prep' | 'sowing' | 'fertilizing' | 'pesticide' | 'irrigation' | 'harvesting' | 'packing' | 'other'
  description?: string
  photoFileIds?: string[]
  createSeasonFarmChoices?: FarmChoice[]
  createSeasonFarmId?: string
  createSeasonCropName?: string
  createSeasonStartDate?: string
  createSeasonHarvestStartDate?: string
  createSeasonEstimatedYield?: number
}

const SESSION_TTL_MS = 30 * 60 * 1000
const MAX_PHOTOS_PER_DIARY = 3
const MAX_VOICE_SECONDS = Number(process.env.TELEGRAM_MAX_VOICE_SECONDS || 60)

const EVENT_CHOICES: Array<{ key: WizardDraft['eventType']; label: string }> = [
  { key: 'land_prep', label: 'Làm đất' },
  { key: 'sowing', label: 'Gieo trồng' },
  { key: 'fertilizing', label: 'Bón phân' },
  { key: 'pesticide', label: 'Phun thuốc' },
  { key: 'irrigation', label: 'Tưới nước' },
  { key: 'harvesting', label: 'Thu hoạch' },
  { key: 'packing', label: 'Đóng gói' },
  { key: 'other', label: 'Khác' }
]

const EVENT_DESCRIPTION_GUIDE: Record<NonNullable<WizardDraft['eventType']>, { write: string; voice: string }> = {
  land_prep: {
    write: 'Viết theo mẫu: khu vực + việc đã làm + khối lượng/thời gian. Ví dụ: "Lô A, cày xới 2 luống, dọn cỏ 200m2, làm từ 7h-9h".',
    voice: 'Nói rõ: đang ở lô nào, làm đất bằng cách gì, diện tích bao nhiêu, bắt đầu-kết thúc lúc nào.'
  },
  sowing: {
    write: 'Viết theo mẫu: giống + mật độ/số lượng + cách gieo + tưới sau gieo. Ví dụ: "Gieo cà rốt giống X, 30 hạt/m2, gieo hàng, tưới nhẹ sau gieo".',
    voice: 'Nói rõ: giống cây gì, gieo bao nhiêu, cách gieo, sau gieo có tưới hay phủ đất không.'
  },
  fertilizing: {
    write: 'Viết theo mẫu: loại phân + liều lượng + cách bón + khu vực bón. Ví dụ: "Bón NPK 16-16-8, 30kg/1000m2, bón rải quanh gốc lô B".',
    voice: 'Nói rõ tên phân, lượng dùng, bón cho khu nào và bón bằng cách nào.'
  },
  pesticide: {
    write: 'Viết theo mẫu: tên thuốc/hoạt chất + liều pha + mục tiêu phòng trừ + thời gian phun. Ví dụ: "Phun Abamectin 3ml/bình 16L trị sâu tơ lúc 16h".',
    voice: 'Nói rõ: phun thuốc gì, pha liều bao nhiêu, trị sâu/bệnh gì, phun lúc mấy giờ.'
  },
  irrigation: {
    write: 'Viết theo mẫu: phương pháp tưới + thời lượng/lượng nước + khu vực. Ví dụ: "Tưới nhỏ giọt lô C trong 25 phút, độ ẩm đất đạt yêu cầu".',
    voice: 'Nói rõ: tưới kiểu gì, tưới bao lâu hoặc bao nhiêu nước, tưới ở lô nào.'
  },
  harvesting: {
    write: 'Viết theo mẫu: sản phẩm + sản lượng + chất lượng sơ bộ + khu vực thu. Ví dụ: "Thu hoạch cải xanh lô A, 120kg, lá đồng đều, không dập".',
    voice: 'Nói rõ: thu hoạch gì, được bao nhiêu kg, chất lượng ra sao, thu ở khu nào.'
  },
  packing: {
    write: 'Viết theo mẫu: cách đóng gói + số kiện/số kg + quy cách. Ví dụ: "Đóng gói 40 túi x 1kg, dán tem truy xuất, bảo quản mát".',
    voice: 'Nói rõ: đóng bao nhiêu gói/thùng, mỗi gói bao nhiêu kg, có dán tem hay phân loại không.'
  },
  other: {
    write: 'Viết ngắn gọn theo mẫu: việc đã làm + kết quả + ghi chú. Ví dụ: "Làm cỏ rãnh thoát nước lô D, thông rãnh tốt, không còn đọng nước".',
    voice: 'Nói rõ bạn đã làm việc gì, ở đâu, kết quả sau khi làm.'
  }
}

const db = prisma as unknown as {
  telegram_diary_sessions: {
    findUnique(args: { where: { chat_id: string } }): Promise<{
      chat_id: string
      user_id: string
      step: WizardStep
      draft_data: unknown
      expires_at: Date
    } | null>
    upsert(args: {
      where: { chat_id: string }
      create: { chat_id: string; user_id: string; step: WizardStep; draft_data: unknown; expires_at: Date }
      update: { user_id?: string; step?: WizardStep; draft_data?: unknown; expires_at?: Date; updated_at?: Date }
    }): Promise<unknown>
    deleteMany(args: { where: { chat_id?: string; expires_at?: { lt: Date } } }): Promise<unknown>
  }
}

function toDraft(value: unknown): WizardDraft {
  if (!value || typeof value !== 'object') return {}
  return value as WizardDraft
}

function parseNumberChoice(text: string): number | null {
  const n = parseInt(text.trim(), 10)
  if (!Number.isFinite(n)) return null
  return n
}

function parseInlineChoice(prefix: string, callbackData: string): string | null {
  const p = `${prefix}:`
  if (!callbackData.startsWith(p)) return null
  return callbackData.slice(p.length).trim() || null
}

async function cleanupExpiredSessions() {
  await db.telegram_diary_sessions.deleteMany({
    where: { expires_at: { lt: new Date() } }
  })
}

async function getLinkedFarmerByChatId(chatId: string) {
  return prisma.users.findFirst({
    where: { telegram_chat_id: chatId, role: 'farmer' },
    select: { id: true }
  })
}

async function saveSession(params: { chatId: string; userId: string; step: WizardStep; draft: WizardDraft }) {
  const expires = new Date(Date.now() + SESSION_TTL_MS)
  await db.telegram_diary_sessions.upsert({
    where: { chat_id: params.chatId },
    create: {
      chat_id: params.chatId,
      user_id: params.userId,
      step: params.step,
      draft_data: params.draft,
      expires_at: expires
    },
    update: {
      user_id: params.userId,
      step: params.step,
      draft_data: params.draft,
      expires_at: expires,
      updated_at: new Date()
    }
  })
}

async function clearSession(chatId: string) {
  await db.telegram_diary_sessions.deleteMany({ where: { chat_id: chatId } })
}

async function askSeason(chatId: string, userId: string) {
  const seasons = await prisma.seasons.findMany({
    where: {
      farms: { owner_user_id: userId },
      status: { in: ['draft', 'ready_to_anchor', 'amended'] }
    },
    orderBy: { created_at: 'desc' },
    take: 8,
    select: {
      id: true,
      code: true,
      crop_name: true,
      farm_id: true
    }
  })

  if (seasons.length === 0) {
    await sendTelegramTextUsingBotToken(chatId, 'Bạn chưa có mùa vụ đang hoạt động để ghi nhật ký.')
    return
  }

  const choices: SeasonChoice[] = seasons.map((s) => ({
    seasonId: s.id,
    farmId: s.farm_id,
    label: `${s.code} - ${s.crop_name}`
  }))

  await saveSession({ chatId, userId, step: 'awaiting_season', draft: { seasonChoices: choices, photoFileIds: [] } })
  const list = choices.map((c, i) => `${i + 1}. ${c.label}`).join('\n')
  await sendTelegramInlineKeyboardUsingBotToken({
    chatId,
    text: `Bắt đầu ghi nhật ký. Chọn mùa vụ:\n${list}\n\n(Bạn có thể bấm nút hoặc gõ số)`,
    inlineKeyboard: [
      ...choices.map((c, i) => [{ text: `${i + 1}. ${c.label}`, callback_data: `wiz_season:${i + 1}` }]),
      [{ text: '❌ Hủy', callback_data: 'wiz_cancel' }]
    ]
  })
}

async function askEventType(chatId: string, userId: string, draft: WizardDraft) {
  await saveSession({ chatId, userId, step: 'awaiting_event_type', draft })
  const list = EVENT_CHOICES.map((e, i) => `${i + 1}. ${e.label}`).join('\n')
  await sendTelegramInlineKeyboardUsingBotToken({
    chatId,
    text: `Chọn loại công việc:\n${list}\n\n(Bấm nút hoặc gõ số)`,
    inlineKeyboard: [
      ...EVENT_CHOICES.map((e, i) => [{ text: `${i + 1}. ${e.label}`, callback_data: `wiz_event:${i + 1}` }]),
      [{ text: '❌ Hủy', callback_data: 'wiz_cancel' }]
    ]
  })
}

async function askNewSeasonFarm(chatId: string, userId: string) {
  const farms = await prisma.farms.findMany({
    where: { owner_user_id: userId },
    orderBy: { created_at: 'desc' },
    take: 8,
    select: { id: true, name: true, crop_main: true }
  })
  if (farms.length === 0) {
    await sendTelegramTextUsingBotToken(chatId, 'Bạn chưa có nông trại nào. Vui lòng tạo nông trại trên app trước khi tạo mùa vụ.')
    return
  }
  const choices: FarmChoice[] = farms.map((f) => ({
    farmId: f.id,
    label: f.crop_main ? `${f.name} (${f.crop_main})` : f.name
  }))
  await saveSession({
    chatId,
    userId,
    step: 'awaiting_new_season_farm',
    draft: { createSeasonFarmChoices: choices }
  })
  const list = choices.map((c, i) => `${i + 1}. ${c.label}`).join('\n')
  await sendTelegramInlineKeyboardUsingBotToken({
    chatId,
    text: `Tạo mùa vụ mới. Chọn nông trại:\n${list}\n\n(Bạn có thể bấm nút hoặc gõ số)`,
    inlineKeyboard: [
      ...choices.map((c, i) => [{ text: `${i + 1}. ${c.label}`, callback_data: `wiz_new_farm:${i + 1}` }]),
      [{ text: '❌ Hủy', callback_data: 'wiz_cancel' }]
    ]
  })
}

async function askNewSeasonCropName(chatId: string, userId: string, draft: WizardDraft) {
  await saveSession({ chatId, userId, step: 'awaiting_new_season_crop', draft })
  await sendTelegramTextUsingBotToken(chatId, 'Nhập tên cây trồng. Ví dụ: Cà rốt, Dưa leo, Cải xanh.')
}

async function askNewSeasonStartDate(chatId: string, userId: string, draft: WizardDraft) {
  await saveSession({ chatId, userId, step: 'awaiting_new_season_start_date', draft })
  await sendCalendarPickerMessage({
    chatId,
    field: 'start',
    month: new Date(),
    hint: '📅 Chọn ngày bắt đầu mùa vụ'
  })
}

async function askNewSeasonHarvestStartDate(chatId: string, userId: string, draft: WizardDraft) {
  await saveSession({ chatId, userId, step: 'awaiting_new_season_harvest_start', draft })
  const baseMonth = draft.createSeasonStartDate ? parseDateOnly(draft.createSeasonStartDate) ?? new Date() : new Date()
  await sendCalendarPickerMessage({
    chatId,
    field: 'harvest',
    month: baseMonth,
    hint: '📅 Chọn ngày bắt đầu thu hoạch dự kiến'
  })
}

async function askNewSeasonEstimatedYield(chatId: string, userId: string, draft: WizardDraft) {
  await saveSession({ chatId, userId, step: 'awaiting_new_season_estimated_yield', draft })
  await sendTelegramTextUsingBotToken(chatId, 'Nhập sản lượng ước tính (kg). Ví dụ: 1200')
}

function validDateInput(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function parseDateOnly(input: string): Date | null {
  if (!validDateInput(input)) return null
  const d = new Date(`${input}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function parseMonthKey(monthKey: string): Date | null {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return null
  const d = new Date(`${monthKey}-01T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function addMonths(base: Date, delta: number): Date {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + delta, 1))
}

function monthLabelVi(month: Date): string {
  return `Tháng ${month.getUTCMonth() + 1}/${month.getUTCFullYear()}`
}

function firstDayMondayIndex(month: Date): number {
  const js = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1)).getUTCDay()
  return (js + 6) % 7
}

function daysInMonth(month: Date): number {
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate()
}

function buildCalendarKeyboard(field: CalendarField, month: Date): Array<Array<{ text: string; callback_data: string }>> {
  const monthKey = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, '0')}`
  const rows: Array<Array<{ text: string; callback_data: string }>> = []
  rows.push([
    { text: '◀️', callback_data: `wiz_cal_nav:${field}:${addMonths(month, -1).toISOString().slice(0, 7)}` },
    { text: monthLabelVi(month), callback_data: 'wiz_noop' },
    { text: '▶️', callback_data: `wiz_cal_nav:${field}:${addMonths(month, 1).toISOString().slice(0, 7)}` }
  ])
  rows.push([
    { text: 'T2', callback_data: 'wiz_noop' },
    { text: 'T3', callback_data: 'wiz_noop' },
    { text: 'T4', callback_data: 'wiz_noop' },
    { text: 'T5', callback_data: 'wiz_noop' },
    { text: 'T6', callback_data: 'wiz_noop' },
    { text: 'T7', callback_data: 'wiz_noop' },
    { text: 'CN', callback_data: 'wiz_noop' }
  ])
  const first = firstDayMondayIndex(month)
  const total = daysInMonth(month)
  let day = 1
  for (let w = 0; w < 6; w++) {
    const row: Array<{ text: string; callback_data: string }> = []
    for (let i = 0; i < 7; i++) {
      if ((w === 0 && i < first) || day > total) {
        row.push({ text: ' ', callback_data: 'wiz_noop' })
        continue
      }
      const dd = String(day).padStart(2, '0')
      row.push({
        text: String(day),
        callback_data: `wiz_cal_pick:${field}:${monthKey}-${dd}`
      })
      day += 1
    }
    rows.push(row)
    if (day > total) break
  }
  return rows
}

async function sendCalendarPickerMessage(params: {
  chatId: string
  field: CalendarField
  month: Date
  messageId?: number
  hint?: string
}) {
  const keyboard = buildCalendarKeyboard(params.field, params.month)
  const fieldLabel = params.field === 'start' ? 'ngày bắt đầu mùa vụ' : 'ngày bắt đầu thu hoạch dự kiến'
  const text =
    `${params.hint ?? '📅 Chọn ngày trên lịch bên dưới'}\n` +
    `Đang chọn: ${fieldLabel}\n` +
    '(Bạn vẫn có thể gõ tay theo định dạng YYYY-MM-DD)'

  if (Number.isFinite(params.messageId)) {
    await editTelegramMessageTextWithInlineKeyboardUsingBotToken({
      chatId: params.chatId,
      messageId: params.messageId as number,
      text,
      inlineKeyboard: keyboard
    })
    return
  }
  await sendTelegramInlineKeyboardUsingBotToken({
    chatId: params.chatId,
    text,
    inlineKeyboard: keyboard
  })
}

function buildNewSeasonConfirmText(draft: WizardDraft): string {
  return (
    'Xác nhận tạo mùa vụ:\n' +
    `- Cây trồng: ${draft.createSeasonCropName ?? '—'}\n` +
    `- Ngày bắt đầu: ${draft.createSeasonStartDate ?? '—'}\n` +
    `- Dự kiến thu hoạch: ${draft.createSeasonHarvestStartDate ?? '—'}\n` +
    `- Sản lượng ước tính: ${draft.createSeasonEstimatedYield ?? '—'} kg`
  )
}

async function askNewSeasonConfirm(chatId: string, userId: string, draft: WizardDraft) {
  await saveSession({ chatId, userId, step: 'awaiting_new_season_confirm', draft })
  await sendTelegramInlineKeyboardUsingBotToken({
    chatId,
    text: `${buildNewSeasonConfirmText(draft)}\n\n(Bấm nút hoặc gõ XACNHAN/HUY)`,
    inlineKeyboard: [
      [{ text: '✅ Xác nhận tạo mùa vụ', callback_data: 'wiz_new_confirm' }, { text: '❌ Hủy', callback_data: 'wiz_cancel' }]
    ]
  })
}

async function sendFirstCareStepHint(chatId: string, seasonId: string): Promise<void> {
  const plan = await prisma.season_care_plans.findUnique({
    where: { season_id: seasonId },
    select: { id: true }
  })
  if (!plan) return
  const step = await prisma.season_care_plan_steps.findFirst({
    where: { plan_id: plan.id },
    orderBy: { step_no: 'asc' },
    select: { step_no: true, title: true, detail: true, day_offset: true, scheduled_date: true }
  })
  if (!step) return
  const scheduledDateLabel = step.scheduled_date ? step.scheduled_date.toISOString().slice(0, 10) : 'chưa xác định'
  await sendTelegramTextUsingBotToken(
    chatId,
    `Bước đầu tiên của mùa vụ:\n- Bước ${step.step_no}: ${step.title}\n- Thời điểm: ngày +${step.day_offset} (${scheduledDateLabel})\n- Việc cần làm: ${step.detail}`
  )
}

async function askDescription(chatId: string, userId: string, draft: WizardDraft) {
  await saveSession({ chatId, userId, step: 'awaiting_description', draft })
  const selectedType = draft.eventType
  const guide = selectedType ? EVENT_DESCRIPTION_GUIDE[selectedType] : null
  const typeLabel = EVENT_CHOICES.find((e) => e.key === selectedType)?.label ?? 'Công việc đã chọn'
  const guideText = guide
    ? `\n\nHướng dẫn cho "${typeLabel}":\n- Viết: ${guide.write}\n- Voice: ${guide.voice}`
    : ''
  await sendTelegramTextUsingBotToken(
    chatId,
    `Nhập mô tả công việc (ít nhất 8 ký tự) hoặc gửi voice tối đa ${MAX_VOICE_SECONDS}s.${guideText}`
  )
}

async function askDescriptionConfirm(chatId: string, userId: string, draft: WizardDraft) {
  await saveSession({ chatId, userId, step: 'awaiting_description_confirm', draft })
  await sendTelegramInlineKeyboardUsingBotToken({
    chatId,
    text:
      `Mô tả đã nhận:\n"${draft.description ?? ''}"\n\n` +
      'Nếu đúng, bấm ✅ Xác nhận mô tả.\n' +
      'Nếu muốn ghi âm lại, bấm 🎙️ Voice lại.\n' +
      'Bạn cũng có thể sửa mô tả bằng cách gửi text mới, rồi bấm xác nhận.',
    inlineKeyboard: [
      [{ text: '✅ Xác nhận mô tả', callback_data: 'wiz_desc_confirm' }],
      [{ text: '🎙️ Voice lại', callback_data: 'wiz_desc_revoice' }],
      [{ text: '❌ Hủy', callback_data: 'wiz_cancel' }]
    ]
  })
}

async function askPhotos(chatId: string, userId: string, draft: WizardDraft) {
  await saveSession({ chatId, userId, step: 'awaiting_photos', draft })
  await sendTelegramInlineKeyboardUsingBotToken({
    chatId,
    text: `Gửi ảnh thực địa (tối đa ${MAX_PHOTOS_PER_DIARY} ảnh).\nBạn có thể bấm nút bên dưới để hoàn tất/bỏ qua, hoặc tiếp tục gửi ảnh.`,
    inlineKeyboard: [
      [{ text: '✅ Hoàn tất', callback_data: 'wiz_photos_done' }],
      [{ text: '⏭️ Bỏ qua ảnh', callback_data: 'wiz_photos_skip' }],
      [{ text: '❌ Hủy', callback_data: 'wiz_cancel' }]
    ]
  })
}

function buildConfirmText(draft: WizardDraft): string {
  const typeLabel = EVENT_CHOICES.find((e) => e.key === draft.eventType)?.label ?? draft.eventType ?? '—'
  const photoCount = draft.photoFileIds?.length ?? 0
  return `Xác nhận lưu nhật ký:\n- Loại công việc: ${typeLabel}\n- Mô tả: ${draft.description ?? '—'}\n- Ảnh: ${photoCount} tấm`
}

async function askConfirm(chatId: string, userId: string, draft: WizardDraft) {
  await saveSession({ chatId, userId, step: 'awaiting_confirm', draft })
  await sendTelegramInlineKeyboardUsingBotToken({
    chatId,
    text: `${buildConfirmText(draft)}\n\n(Bấm nút hoặc gõ XACNHAN/HUY)`,
    inlineKeyboard: [
      [
        { text: '✅ Xác nhận lưu', callback_data: 'wiz_confirm' },
        { text: '❌ Hủy', callback_data: 'wiz_cancel' }
      ]
    ]
  })
}

async function commitDiary(chatId: string, userId: string, draft: WizardDraft) {
  if (!draft.seasonId || !draft.farmId || !draft.eventType || !draft.description) {
    await sendTelegramTextUsingBotToken(chatId, 'Thiếu dữ liệu để lưu. Vui lòng gõ NHATKY để bắt đầu lại.')
    await clearSession(chatId)
    return
  }

  const created = await diaryService.createDiary({
    userId,
    payload: {
      seasonId: draft.seasonId,
      farmId: draft.farmId,
      eventType: draft.eventType,
      eventDate: new Date().toISOString(),
      description: draft.description,
      extraData: { source: 'telegram_wizard' }
    }
  })

  const fileIds = draft.photoFileIds ?? []
  for (let i = 0; i < fileIds.length; i++) {
    const url = await getTelegramFileUrlUsingBotToken(fileIds[i]!)
    if (!url) continue
    await diaryService.addDiaryAttachment({
      userId,
      diaryId: created.id,
      payload: {
        fileUrl: url,
        mimeType: 'image/jpeg',
        sortOrder: i,
        meta: { source: 'telegram', fileId: fileIds[i] }
      }
    })
  }

  await clearSession(chatId)
  await sendTelegramTextUsingBotToken(
    chatId,
    `Đã ghi nhận thành công nhật ký.\n- Loại công việc: ${EVENT_CHOICES.find((e) => e.key === draft.eventType)?.label}\n- Mô tả: ${draft.description}\n- Ảnh: ${fileIds.length} tấm`
  )
  await sendTelegramQuickActionsMenuUsingBotToken(chatId)
}

function isStartDiaryKeyword(text: string): boolean {
  const t = text.trim().toLowerCase()
  return t === 'nhatky' || t === 'nhật ký' || t === '/nhatky' || t === '/diary'
}

function isStartNewSeasonKeyword(text: string): boolean {
  const t = text.trim().toLowerCase()
  return t === 'taomuavu' || t === 'tạo mùa vụ' || t === '/taomuavu' || t === '/newseason'
}

function isCancelKeyword(text: string): boolean {
  const t = text.trim().toLowerCase()
  return t === 'huy' || t === 'huỷ' || t === '/cancel'
}

export const telegramDiaryWizardService = {
  async handleIncoming(params: {
    chatId: string
    text?: string
    photoFileId?: string
    voiceFileId?: string
    voiceDurationSec?: number
    callbackData?: string
    callbackMessageId?: number
  }): Promise<boolean> {
    await cleanupExpiredSessions()

    const farmer = await getLinkedFarmerByChatId(params.chatId)
    if (!farmer) return false

    const text = params.text?.trim() ?? ''
    const callbackData = params.callbackData?.trim() ?? ''
    const callbackMessageId = params.callbackMessageId
    if (callbackData === 'wiz_noop') {
      return true
    }
    if (callbackData === 'wiz_cancel') {
      await clearSession(params.chatId)
      if (Number.isFinite(callbackMessageId)) {
        await editTelegramMessageTextUsingBotToken({
          chatId: params.chatId,
          messageId: callbackMessageId as number,
          text: 'Đã huỷ phiên ghi nhật ký.'
        })
        await sendTelegramQuickActionsMenuUsingBotToken(params.chatId)
        return true
      }
      await sendTelegramTextUsingBotToken(params.chatId, 'Đã huỷ phiên ghi nhật ký.')
      await sendTelegramQuickActionsMenuUsingBotToken(params.chatId)
      return true
    }
    if (text && isCancelKeyword(text)) {
      await clearSession(params.chatId)
      await sendTelegramTextUsingBotToken(params.chatId, 'Đã huỷ phiên ghi nhật ký.')
      await sendTelegramQuickActionsMenuUsingBotToken(params.chatId)
      return true
    }

    const session = await db.telegram_diary_sessions.findUnique({ where: { chat_id: params.chatId } })

    if (!session) {
      if (callbackData === 'wiz_start') {
        await askSeason(params.chatId, farmer.id)
        return true
      }
      if (callbackData === 'wiz_new_season_start') {
        await askNewSeasonFarm(params.chatId, farmer.id)
        return true
      }
      if (!text) return false
      if (isStartDiaryKeyword(text)) {
        await askSeason(params.chatId, farmer.id)
        return true
      }
      if (isStartNewSeasonKeyword(text)) {
        await askNewSeasonFarm(params.chatId, farmer.id)
        return true
      }
      return false
    }

    const draft = toDraft(session.draft_data)
    switch (session.step) {
      case 'awaiting_season': {
        const pickedFromCallback = callbackData ? parseInlineChoice('wiz_season', callbackData) : null
        if (!text && !pickedFromCallback) {
          await sendTelegramTextUsingBotToken(params.chatId, 'Vui lòng trả lời bằng số thứ tự mùa vụ.')
          return true
        }
        const choice = pickedFromCallback ? parseNumberChoice(pickedFromCallback) : parseNumberChoice(text)
        const seasonChoices = draft.seasonChoices ?? []
        if (!choice || choice < 1 || choice > seasonChoices.length) {
          await sendTelegramTextUsingBotToken(params.chatId, 'Số không hợp lệ. Vui lòng chọn lại mùa vụ theo danh sách.')
          return true
        }
        const selected = seasonChoices[choice - 1]!
        if (pickedFromCallback && Number.isFinite(callbackMessageId)) {
          await editTelegramMessageTextUsingBotToken({
            chatId: params.chatId,
            messageId: callbackMessageId as number,
            text: `Đã chọn mùa vụ: ${selected.label}`
          })
        }
        await askEventType(params.chatId, farmer.id, {
          ...draft,
          seasonId: selected.seasonId,
          farmId: selected.farmId
        })
        return true
      }
      case 'awaiting_event_type': {
        const pickedFromCallback = callbackData ? parseInlineChoice('wiz_event', callbackData) : null
        if (!text && !pickedFromCallback) {
          await sendTelegramTextUsingBotToken(params.chatId, 'Vui lòng trả lời bằng số loại công việc.')
          return true
        }
        const choice = pickedFromCallback ? parseNumberChoice(pickedFromCallback) : parseNumberChoice(text)
        if (!choice || choice < 1 || choice > EVENT_CHOICES.length) {
          await sendTelegramTextUsingBotToken(params.chatId, 'Loại công việc không hợp lệ. Chọn theo số từ 1 đến 8.')
          return true
        }
        const selected = EVENT_CHOICES[choice - 1]!
        if (pickedFromCallback && Number.isFinite(callbackMessageId)) {
          await editTelegramMessageTextUsingBotToken({
            chatId: params.chatId,
            messageId: callbackMessageId as number,
            text: `Đã chọn loại công việc: ${selected.label}`
          })
        }
        await askDescription(params.chatId, farmer.id, { ...draft, eventType: selected.key })
        return true
      }
      case 'awaiting_description': {
        let normalizedDescription = text
        if (!normalizedDescription && params.voiceFileId) {
          if (
            Number.isFinite(params.voiceDurationSec) &&
            (params.voiceDurationSec as number) > MAX_VOICE_SECONDS
          ) {
            await sendTelegramTextUsingBotToken(
              params.chatId,
              `Voice quá dài (${params.voiceDurationSec}s). Vui lòng gửi voice tối đa ${MAX_VOICE_SECONDS}s hoặc nhập mô tả bằng chữ.`
            )
            return true
          }
          await sendTelegramTextUsingBotToken(params.chatId, 'Đang nhận diện nội dung voice...')
          const transcribed = await transcribeTelegramVoiceToText(params.voiceFileId, {
            eventTypeLabel: EVENT_CHOICES.find((e) => e.key === draft.eventType)?.label
          }).catch(() => null)
          if (transcribed) {
            normalizedDescription = transcribed
            await sendTelegramTextUsingBotToken(params.chatId, `Đã nhận diện: "${normalizedDescription}"`)
          } else {
            await sendTelegramTextUsingBotToken(
              params.chatId,
              'Không nhận diện được voice. Bạn hãy nói rõ hơn, gửi voice ngắn hơn, hoặc nhập mô tả bằng chữ.'
            )
            return true
          }
        }

        if (!normalizedDescription || normalizedDescription.length < 8) {
          await sendTelegramTextUsingBotToken(params.chatId, 'Mô tả quá ngắn. Vui lòng nhập chi tiết hơn (ít nhất 8 ký tự).')
          return true
        }
        if (params.voiceFileId) {
          await askDescriptionConfirm(params.chatId, farmer.id, {
            ...draft,
            description: normalizedDescription,
            photoFileIds: draft.photoFileIds ?? []
          })
          return true
        }
        await askPhotos(params.chatId, farmer.id, { ...draft, description: normalizedDescription, photoFileIds: draft.photoFileIds ?? [] })
        return true
      }
      case 'awaiting_description_confirm': {
        const t = text.toLowerCase()
        if (callbackData === 'wiz_desc_revoice' || t === 'voice lai' || t === 'ghi am lai' || t === 'ghi âm lại') {
          await askDescription(params.chatId, farmer.id, { ...draft, description: undefined })
          return true
        }
        if (callbackData === 'wiz_desc_confirm' || t === 'xacnhan' || t === 'xác nhận' || t === 'ok') {
          if (!draft.description || draft.description.length < 8) {
            await askDescription(params.chatId, farmer.id, draft)
            return true
          }
          await askPhotos(params.chatId, farmer.id, { ...draft, photoFileIds: draft.photoFileIds ?? [] })
          return true
        }

        if (params.voiceFileId) {
          if (
            Number.isFinite(params.voiceDurationSec) &&
            (params.voiceDurationSec as number) > MAX_VOICE_SECONDS
          ) {
            await sendTelegramTextUsingBotToken(
              params.chatId,
              `Voice quá dài (${params.voiceDurationSec}s). Vui lòng gửi voice tối đa ${MAX_VOICE_SECONDS}s hoặc nhập mô tả bằng chữ.`
            )
            return true
          }
          await sendTelegramTextUsingBotToken(params.chatId, 'Đang nhận diện nội dung voice...')
          const transcribed = await transcribeTelegramVoiceToText(params.voiceFileId, {
            eventTypeLabel: EVENT_CHOICES.find((e) => e.key === draft.eventType)?.label
          }).catch(() => null)
          if (!transcribed || transcribed.length < 8) {
            await sendTelegramTextUsingBotToken(
              params.chatId,
              'Không nhận diện được mô tả đủ rõ. Bạn có thể voice lại hoặc gửi text mô tả chi tiết hơn.'
            )
            return true
          }
          await askDescriptionConfirm(params.chatId, farmer.id, { ...draft, description: transcribed, photoFileIds: draft.photoFileIds ?? [] })
          return true
        }

        if (text && text.length >= 8) {
          await askDescriptionConfirm(params.chatId, farmer.id, { ...draft, description: text, photoFileIds: draft.photoFileIds ?? [] })
          return true
        }
        await sendTelegramTextUsingBotToken(
          params.chatId,
          'Bấm ✅ để xác nhận mô tả hiện tại, bấm 🎙️ để voice lại, hoặc gửi text mới để sửa mô tả.'
        )
        return true
      }
      case 'awaiting_photos': {
        const currentPhotos = draft.photoFileIds ?? []
        if (callbackData === 'wiz_photos_done' || callbackData === 'wiz_photos_skip') {
          await askConfirm(params.chatId, farmer.id, draft)
          return true
        }
        if (params.photoFileId) {
          if (currentPhotos.length >= MAX_PHOTOS_PER_DIARY) {
            await sendTelegramInlineKeyboardUsingBotToken({
              chatId: params.chatId,
              text: `Đã đủ ${MAX_PHOTOS_PER_DIARY} ảnh cho một nhật ký. Bấm "✅ Hoàn tất" để tiếp tục.`,
              inlineKeyboard: [
                [{ text: '✅ Hoàn tất', callback_data: 'wiz_photos_done' }],
                [{ text: '❌ Hủy', callback_data: 'wiz_cancel' }]
              ]
            })
            return true
          }
          const next = [...currentPhotos, params.photoFileId]
          await saveSession({ chatId: params.chatId, userId: farmer.id, step: 'awaiting_photos', draft: { ...draft, photoFileIds: next } })
          if (next.length >= MAX_PHOTOS_PER_DIARY) {
            await sendTelegramInlineKeyboardUsingBotToken({
              chatId: params.chatId,
              text: `Đã nhận ảnh ${next.length}/${MAX_PHOTOS_PER_DIARY}. Bạn đã đủ số ảnh, bấm "✅ Hoàn tất" để sang bước xác nhận.`,
              inlineKeyboard: [
                [{ text: '✅ Hoàn tất', callback_data: 'wiz_photos_done' }],
                [{ text: '❌ Hủy', callback_data: 'wiz_cancel' }]
              ]
            })
            return true
          }
          await sendTelegramInlineKeyboardUsingBotToken({
            chatId: params.chatId,
            text: `Đã nhận ảnh ${next.length}/${MAX_PHOTOS_PER_DIARY}. Gửi thêm ảnh hoặc bấm "✅ Hoàn tất".`,
            inlineKeyboard: [
              [{ text: '✅ Hoàn tất', callback_data: 'wiz_photos_done' }],
              [{ text: '⏭️ Bỏ qua ảnh', callback_data: 'wiz_photos_skip' }],
              [{ text: '❌ Hủy', callback_data: 'wiz_cancel' }]
            ]
          })
          return true
        }
        const t = text.toLowerCase()
        if (t === 'boqua' || t === 'bỏ qua' || t === 'xong') {
          await askConfirm(params.chatId, farmer.id, draft)
          return true
        }
        await sendTelegramInlineKeyboardUsingBotToken({
          chatId: params.chatId,
          text: 'Bạn có thể gửi ảnh hoặc bấm "✅ Hoàn tất" để tiếp tục.',
          inlineKeyboard: [
            [{ text: '✅ Hoàn tất', callback_data: 'wiz_photos_done' }],
            [{ text: '⏭️ Bỏ qua ảnh', callback_data: 'wiz_photos_skip' }],
            [{ text: '❌ Hủy', callback_data: 'wiz_cancel' }]
          ]
        })
        return true
      }
      case 'awaiting_new_season_farm': {
        const pickedFromCallback = callbackData ? parseInlineChoice('wiz_new_farm', callbackData) : null
        if (!text && !pickedFromCallback) {
          await sendTelegramTextUsingBotToken(params.chatId, 'Vui lòng trả lời bằng số thứ tự nông trại.')
          return true
        }
        const choice = pickedFromCallback ? parseNumberChoice(pickedFromCallback) : parseNumberChoice(text)
        const farmChoices = draft.createSeasonFarmChoices ?? []
        if (!choice || choice < 1 || choice > farmChoices.length) {
          await sendTelegramTextUsingBotToken(params.chatId, 'Số không hợp lệ. Vui lòng chọn lại nông trại theo danh sách.')
          return true
        }
        const selected = farmChoices[choice - 1]!
        if (pickedFromCallback && Number.isFinite(callbackMessageId)) {
          await editTelegramMessageTextUsingBotToken({
            chatId: params.chatId,
            messageId: callbackMessageId as number,
            text: `Đã chọn nông trại: ${selected.label}`
          })
        }
        await askNewSeasonCropName(params.chatId, farmer.id, {
          ...draft,
          createSeasonFarmId: selected.farmId
        })
        return true
      }
      case 'awaiting_new_season_crop': {
        if (!text || text.length < 2) {
          await sendTelegramTextUsingBotToken(params.chatId, 'Tên cây trồng quá ngắn. Vui lòng nhập lại.')
          return true
        }
        await askNewSeasonStartDate(params.chatId, farmer.id, { ...draft, createSeasonCropName: text })
        return true
      }
      case 'awaiting_new_season_start_date': {
        const navMonth = callbackData ? parseInlineChoice('wiz_cal_nav:start', callbackData) : null
        if (navMonth) {
          const month = parseMonthKey(navMonth)
          if (!month) {
            await sendTelegramTextUsingBotToken(params.chatId, 'Không đọc được tháng lịch. Vui lòng chọn lại.')
            return true
          }
          await sendCalendarPickerMessage({
            chatId: params.chatId,
            field: 'start',
            month,
            messageId: callbackMessageId,
            hint: '📅 Chọn ngày bắt đầu mùa vụ'
          })
          return true
        }
        const pickedDate = callbackData ? parseInlineChoice('wiz_cal_pick:start', callbackData) : null
        const finalStartDate = pickedDate ?? text
        if (!finalStartDate || !validDateInput(finalStartDate)) {
          await sendTelegramTextUsingBotToken(params.chatId, 'Ngày không hợp lệ. Vui lòng chọn trên lịch hoặc nhập theo định dạng YYYY-MM-DD.')
          return true
        }
        await askNewSeasonHarvestStartDate(params.chatId, farmer.id, { ...draft, createSeasonStartDate: finalStartDate })
        return true
      }
      case 'awaiting_new_season_harvest_start': {
        const navMonth = callbackData ? parseInlineChoice('wiz_cal_nav:harvest', callbackData) : null
        if (navMonth) {
          const month = parseMonthKey(navMonth)
          if (!month) {
            await sendTelegramTextUsingBotToken(params.chatId, 'Không đọc được tháng lịch. Vui lòng chọn lại.')
            return true
          }
          await sendCalendarPickerMessage({
            chatId: params.chatId,
            field: 'harvest',
            month,
            messageId: callbackMessageId,
            hint: '📅 Chọn ngày bắt đầu thu hoạch dự kiến'
          })
          return true
        }
        const pickedDate = callbackData ? parseInlineChoice('wiz_cal_pick:harvest', callbackData) : null
        const finalHarvestStart = pickedDate ?? text
        if (!finalHarvestStart || !validDateInput(finalHarvestStart)) {
          await sendTelegramTextUsingBotToken(params.chatId, 'Ngày không hợp lệ. Vui lòng chọn trên lịch hoặc nhập theo định dạng YYYY-MM-DD.')
          return true
        }
        const startDate = draft.createSeasonStartDate ? parseDateOnly(draft.createSeasonStartDate) : null
        const harvestDate = parseDateOnly(finalHarvestStart)
        if (!startDate || !harvestDate) {
          await sendTelegramTextUsingBotToken(params.chatId, 'Thiếu ngày bắt đầu mùa vụ. Vui lòng chọn lại từ đầu.')
          await askNewSeasonStartDate(params.chatId, farmer.id, draft)
          return true
        }
        if (harvestDate.getTime() < startDate.getTime()) {
          await sendTelegramTextUsingBotToken(
            params.chatId,
            `Ngày thu hoạch phải từ ${formatDateOnly(startDate)} trở đi. Vui lòng chọn lại.`
          )
          return true
        }
        await askNewSeasonEstimatedYield(params.chatId, farmer.id, {
          ...draft,
          createSeasonHarvestStartDate: finalHarvestStart
        })
        return true
      }
      case 'awaiting_new_season_estimated_yield': {
        const n = Number(text)
        if (!text || !Number.isFinite(n) || n <= 0) {
          await sendTelegramTextUsingBotToken(params.chatId, 'Sản lượng ước tính không hợp lệ. Vui lòng nhập số > 0.')
          return true
        }
        await askNewSeasonConfirm(params.chatId, farmer.id, {
          ...draft,
          createSeasonEstimatedYield: Math.round(n * 100) / 100
        })
        return true
      }
      case 'awaiting_new_season_confirm': {
        const t = text.toLowerCase()
        if (callbackData === 'wiz_new_confirm' || t === 'xacnhan' || t === 'xác nhận' || t === 'ok') {
          if (
            !draft.createSeasonFarmId ||
            !draft.createSeasonCropName ||
            !draft.createSeasonStartDate ||
            !draft.createSeasonHarvestStartDate ||
            !draft.createSeasonEstimatedYield
          ) {
            await sendTelegramTextUsingBotToken(params.chatId, 'Thiếu dữ liệu tạo mùa vụ. Vui lòng bắt đầu lại bằng "Tạo mùa vụ".')
            await clearSession(params.chatId)
            return true
          }
          await sendTelegramTextUsingBotToken(params.chatId, 'Đang tạo mùa vụ, vui lòng chờ...')
          const created = await seasonService.createSeason({
            userId: farmer.id,
            payload: {
              farmId: draft.createSeasonFarmId,
              cropName: draft.createSeasonCropName,
              startDate: draft.createSeasonStartDate,
              harvestStartDate: draft.createSeasonHarvestStartDate,
              estimatedYield: draft.createSeasonEstimatedYield,
              yieldUnit: 'kg'
            }
          })
          await clearSession(params.chatId)
          await sendTelegramTextUsingBotToken(
            params.chatId,
            `Đã tạo mùa vụ thành công.\n- Mã vụ: ${created.code}\n- Cây trồng: ${created.crop_name}\n- Bắt đầu: ${created.start_date.toISOString().slice(0, 10)}`
          )
          await sendFirstCareStepHint(params.chatId, created.id)
          await sendTelegramQuickActionsMenuUsingBotToken(params.chatId)
          return true
        }
        if (callbackData === 'wiz_cancel' || t === 'huy' || t === 'huỷ') {
          await clearSession(params.chatId)
          await sendTelegramTextUsingBotToken(params.chatId, 'Đã huỷ tạo mùa vụ.')
          await sendTelegramQuickActionsMenuUsingBotToken(params.chatId)
          return true
        }
        await sendTelegramTextUsingBotToken(params.chatId, 'Gõ XACNHAN để tạo mùa vụ hoặc HUY để huỷ.')
        return true
      }
      case 'awaiting_confirm': {
        const t = text.toLowerCase()
        if (callbackData === 'wiz_confirm' || t === 'xacnhan' || t === 'xác nhận' || t === 'ok') {
          if (callbackData === 'wiz_confirm' && Number.isFinite(callbackMessageId)) {
            await editTelegramMessageTextUsingBotToken({
              chatId: params.chatId,
              messageId: callbackMessageId as number,
              text: 'Đã xác nhận, đang lưu nhật ký...'
            })
          }
          await commitDiary(params.chatId, farmer.id, draft)
          return true
        }
        if (callbackData === 'wiz_cancel' || t === 'huy' || t === 'huỷ') {
          await clearSession(params.chatId)
          await sendTelegramTextUsingBotToken(params.chatId, 'Đã huỷ phiên ghi nhật ký.')
          await sendTelegramQuickActionsMenuUsingBotToken(params.chatId)
          return true
        }
        await sendTelegramTextUsingBotToken(params.chatId, 'Gõ XACNHAN để lưu hoặc HUY để huỷ.')
        return true
      }
      default:
        await clearSession(params.chatId)
        return true
    }
  }
}
