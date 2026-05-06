import { SchemaType, type Schema } from '@google/generative-ai'
import geminiService from '~/lib/gemini'
import prisma from '~/lib/prisma'

type CareStep = {
  stepNo: number
  title: string
  detail: string
  dayOffset: number
  category: string
}

type CreatePlanResult = {
  planId: string
  cropName: string
  source: string
  steps: CareStep[]
}

type AiGuide = {
  steps: Array<{
    title: string
    detail: string
    dayOffset: number
    category: string
  }>
}

const AI_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  required: ['steps'],
  properties: {
    steps: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        required: ['title', 'detail', 'dayOffset', 'category'],
        properties: {
          title: { type: SchemaType.STRING },
          detail: { type: SchemaType.STRING },
          dayOffset: { type: SchemaType.NUMBER },
          category: { type: SchemaType.STRING }
        }
      }
    }
  }
}

function normalizeCropKey(cropName: string): string {
  return cropName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120)
}

function dayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function addDays(d: Date, offset: number): Date {
  const dt = new Date(d.getTime())
  dt.setUTCDate(dt.getUTCDate() + offset)
  return dt
}

function fallbackGuide(cropName: string): CareStep[] {
  return [
    {
      stepNo: 1,
      title: `Chuẩn bị đất cho ${cropName}`,
      detail: 'Làm sạch cỏ, xử lý mầm bệnh trong đất và tạo rãnh thoát nước.',
      dayOffset: 0,
      category: 'land_prep'
    },
    {
      stepNo: 2,
      title: 'Bón lót',
      detail: 'Bón phân hữu cơ hoai mục kết hợp lượng phân lót phù hợp cho từng giai đoạn.',
      dayOffset: 3,
      category: 'fertilizing'
    },
    {
      stepNo: 3,
      title: 'Tưới nước định kỳ',
      detail: 'Duy trì ẩm độ đất ổn định, tránh khô hạn hoặc úng cục bộ.',
      dayOffset: 7,
      category: 'watering'
    },
    {
      stepNo: 4,
      title: 'Theo dõi sâu bệnh',
      detail: 'Kiểm tra lá/thân/cành và xử lý sớm theo nguyên tắc IPM.',
      dayOffset: 10,
      category: 'pest_control'
    },
    {
      stepNo: 5,
      title: 'Bón thúc giai đoạn sinh trưởng',
      detail: 'Bón thúc theo nhu cầu cây và điều kiện thời tiết thực tế.',
      dayOffset: 20,
      category: 'fertilizing'
    }
  ]
}

async function buildGuideFromAi(cropName: string): Promise<CareStep[]> {
  const prompt = `Lập kế hoạch canh tác thực tế cho cây "${cropName}" ở Việt Nam.
Yêu cầu:
- Trả về 8-12 bước, thứ tự thời gian từ đầu vụ.
- Mỗi bước gồm: title ngắn, detail dễ hiểu cho nông dân, dayOffset (số ngày từ ngày bắt đầu vụ), category.
- category chỉ dùng một trong: land_prep, sowing, watering, fertilizing, pest_control, pruning, harvesting, monitoring.
- dayOffset không âm, tăng dần.
- Nêu cụ thể mốc tưới, bón phân, theo dõi sâu bệnh, phun thuốc (nếu cần) và lưu ý an toàn.`

  const ai = await geminiService.generate<AiGuide>({
    content: prompt,
    systemInstruction:
      'Bạn là chuyên gia nông nghiệp Việt Nam. Trả JSON đúng schema, ngắn gọn, thực hành được.',
    responseSchema: AI_SCHEMA
  })

  if (!ai?.steps?.length) return fallbackGuide(cropName)

  const normalized = ai.steps
    .slice(0, 12)
    .map((s, idx) => ({
      stepNo: idx + 1,
      title: String(s.title ?? '').trim().slice(0, 180) || `Bước ${idx + 1}`,
      detail: String(s.detail ?? '').trim() || 'Theo dõi và cập nhật vào nhật ký.',
      dayOffset: Math.max(0, Number.isFinite(Number(s.dayOffset)) ? Math.round(Number(s.dayOffset)) : idx * 3),
      category: String(s.category ?? 'monitoring').trim().toLowerCase().slice(0, 40) || 'monitoring'
    }))
    .sort((a, b) => a.dayOffset - b.dayOffset)
    .map((s, idx) => ({ ...s, stepNo: idx + 1 }))

  return normalized.length > 0 ? normalized : fallbackGuide(cropName)
}

const db = prisma as unknown as {
  crop_care_templates: {
    findUnique(args: { where: { crop_key: string } }): Promise<{ id: string; crop_name: string; source: string } | null>
    create(args: {
      data: { crop_key: string; crop_name: string; source: string }
      select: { id: true; crop_name: true; source: true }
    }): Promise<{ id: string; crop_name: string; source: string }>
  }
  crop_care_template_steps: {
    findMany(args: {
      where: { template_id: string }
      orderBy: { step_no: 'asc' }
    }): Promise<Array<{ step_no: number; title: string; detail: string; day_offset: number; category: string }>>
    createMany(args: {
      data: Array<{ template_id: string; step_no: number; title: string; detail: string; day_offset: number; category: string }>
    }): Promise<unknown>
  }
  season_care_plans: {
    create(args: {
      data: { season_id: string; template_id?: string | null; crop_name: string; source: string }
      select: { id: true }
    }): Promise<{ id: string }>
  }
  season_care_plan_steps: {
    createMany(args: {
      data: Array<{
        plan_id: string
        step_no: number
        title: string
        detail: string
        day_offset: number
        category: string
        scheduled_date: Date
      }>
    }): Promise<unknown>
  }
}

async function getOrCreateTemplate(cropName: string): Promise<{
  id: string
  cropName: string
  source: string
  steps: CareStep[]
}> {
  const cropKey = normalizeCropKey(cropName)
  const existed = await db.crop_care_templates.findUnique({ where: { crop_key: cropKey } })
  if (existed) {
    const steps = await db.crop_care_template_steps.findMany({
      where: { template_id: existed.id },
      orderBy: { step_no: 'asc' }
    })
    return {
      id: existed.id,
      cropName: existed.crop_name,
      source: existed.source,
      steps: steps.map((s) => ({
        stepNo: s.step_no,
        title: s.title,
        detail: s.detail,
        dayOffset: s.day_offset,
        category: s.category
      }))
    }
  }

  const generatedSteps = await buildGuideFromAi(cropName)
  const created = await db.crop_care_templates.create({
    data: {
      crop_key: cropKey,
      crop_name: cropName.trim().slice(0, 120),
      source: 'ai'
    },
    select: { id: true, crop_name: true, source: true }
  })

  await db.crop_care_template_steps.createMany({
    data: generatedSteps.map((s) => ({
      template_id: created.id,
      step_no: s.stepNo,
      title: s.title,
      detail: s.detail,
      day_offset: s.dayOffset,
      category: s.category
    }))
  })

  return {
    id: created.id,
    cropName: created.crop_name,
    source: created.source,
    steps: generatedSteps
  }
}

class SeasonCarePlanService {
  async createPlanForSeason(params: {
    seasonId: string
    cropName: string
    startDate: Date
  }): Promise<CreatePlanResult> {
    const template = await getOrCreateTemplate(params.cropName)
    const base = dayStart(params.startDate)

    const plan = await db.season_care_plans.create({
      data: {
        season_id: params.seasonId,
        template_id: template.id,
        crop_name: template.cropName,
        source: template.source
      },
      select: { id: true }
    })

    await db.season_care_plan_steps.createMany({
      data: template.steps.map((s) => ({
        plan_id: plan.id,
        step_no: s.stepNo,
        title: s.title,
        detail: s.detail,
        day_offset: s.dayOffset,
        category: s.category,
        scheduled_date: addDays(base, s.dayOffset)
      }))
    })

    return {
      planId: plan.id,
      cropName: template.cropName,
      source: template.source,
      steps: template.steps
    }
  }
}

const seasonCarePlanService = new SeasonCarePlanService()
export default seasonCarePlanService
