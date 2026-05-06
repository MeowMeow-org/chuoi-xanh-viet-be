import prisma from '~/lib/prisma'
import diaryService from '~/modules/diary/diary.service'
import {
  editTelegramMessageTextUsingBotToken,
  getTelegramFileUrlUsingBotToken,
  sendTelegramInlineKeyboardUsingBotToken,
  sendTelegramTextUsingBotToken
} from './telegramBot.service'

type WizardStep = 'awaiting_season' | 'awaiting_event_type' | 'awaiting_description' | 'awaiting_photos' | 'awaiting_confirm'

type SeasonChoice = { seasonId: string; farmId: string; label: string }

type WizardDraft = {
  seasonChoices?: SeasonChoice[]
  seasonId?: string
  farmId?: string
  eventType?: 'land_prep' | 'sowing' | 'fertilizing' | 'pesticide' | 'irrigation' | 'harvesting' | 'packing' | 'other'
  description?: string
  photoFileIds?: string[]
}

const SESSION_TTL_MS = 30 * 60 * 1000

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

async function askDescription(chatId: string, userId: string, draft: WizardDraft) {
  await saveSession({ chatId, userId, step: 'awaiting_description', draft })
  await sendTelegramTextUsingBotToken(chatId, 'Nhập mô tả công việc (voice bổ sung sau). Ví dụ: Bón NPK 16-16-8, 30kg/1000m2.')
}

async function askPhotos(chatId: string, userId: string, draft: WizardDraft) {
  await saveSession({ chatId, userId, step: 'awaiting_photos', draft })
  await sendTelegramTextUsingBotToken(chatId, 'Gửi ảnh thực địa (có thể gửi nhiều ảnh).\nGõ BOQUA để bỏ qua ảnh, hoặc XONG để sang bước xác nhận.')
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
}

function isStartDiaryKeyword(text: string): boolean {
  const t = text.trim().toLowerCase()
  return t === 'nhatky' || t === 'nhật ký' || t === '/nhatky' || t === '/diary'
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
    callbackData?: string
    callbackMessageId?: number
  }): Promise<boolean> {
    await cleanupExpiredSessions()

    const farmer = await getLinkedFarmerByChatId(params.chatId)
    if (!farmer) return false

    const text = params.text?.trim() ?? ''
    const callbackData = params.callbackData?.trim() ?? ''
    const callbackMessageId = params.callbackMessageId
    if (callbackData === 'wiz_cancel') {
      await clearSession(params.chatId)
      if (Number.isFinite(callbackMessageId)) {
        await editTelegramMessageTextUsingBotToken({
          chatId: params.chatId,
          messageId: callbackMessageId as number,
          text: 'Đã huỷ phiên ghi nhật ký.'
        })
        return true
      }
      await sendTelegramTextUsingBotToken(params.chatId, 'Đã huỷ phiên ghi nhật ký.')
      return true
    }
    if (text && isCancelKeyword(text)) {
      await clearSession(params.chatId)
      await sendTelegramTextUsingBotToken(params.chatId, 'Đã huỷ phiên ghi nhật ký.')
      return true
    }

    const session = await db.telegram_diary_sessions.findUnique({ where: { chat_id: params.chatId } })

    if (!session) {
      if (!text || !isStartDiaryKeyword(text)) return false
      await askSeason(params.chatId, farmer.id)
      return true
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
        if (!text || text.length < 8) {
          await sendTelegramTextUsingBotToken(params.chatId, 'Mô tả quá ngắn. Vui lòng nhập chi tiết hơn (ít nhất 8 ký tự).')
          return true
        }
        await askPhotos(params.chatId, farmer.id, { ...draft, description: text, photoFileIds: draft.photoFileIds ?? [] })
        return true
      }
      case 'awaiting_photos': {
        const currentPhotos = draft.photoFileIds ?? []
        if (params.photoFileId) {
          if (currentPhotos.length >= 6) {
            await sendTelegramTextUsingBotToken(params.chatId, 'Đã đủ 6 ảnh cho một nhật ký. Gõ XONG để tiếp tục.')
            return true
          }
          const next = [...currentPhotos, params.photoFileId]
          await saveSession({ chatId: params.chatId, userId: farmer.id, step: 'awaiting_photos', draft: { ...draft, photoFileIds: next } })
          await sendTelegramTextUsingBotToken(params.chatId, `Đã nhận ảnh ${next.length}. Gửi thêm ảnh hoặc gõ XONG.`)
          return true
        }
        const t = text.toLowerCase()
        if (t === 'boqua' || t === 'bỏ qua' || t === 'xong') {
          await askConfirm(params.chatId, farmer.id, draft)
          return true
        }
        await sendTelegramTextUsingBotToken(params.chatId, 'Bạn có thể gửi ảnh, hoặc gõ BOQUA / XONG.')
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
