import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'

export type ImageWorkerItem = {
  success: boolean
  url: string
  thumb: string
  id: string
  size: number
  aspect_ratio: number
  forumImage: { objectKey: string; url: string }
}

function getWorkerConfig() {
  const uploadUrl = process.env.IMAGE_WORKER_SERVICE_API?.trim()
  const apiKey = process.env.IMAGE_WORKER_SERVICE_KEY?.trim()
  if (!uploadUrl || !apiKey) {
    throw new ErrorWithStatus({
      message: USER_MESSAGES.UPLOAD_SERVICE_NOT_CONFIGURED,
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR
    })
  }
  return { uploadUrl, apiKey }
}

async function uploadOneToWorker(file: Express.Multer.File): Promise<ImageWorkerItem> {
  const { uploadUrl, apiKey } = getWorkerConfig()
  const form = new FormData()
  const blob = new Blob([new Uint8Array(file.buffer)], {
    type: file.mimetype || 'application/octet-stream'
  })
  form.append('images', blob, file.originalname || 'image.jpg')

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: form
  })

  const raw = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok) {
    const msg =
      typeof raw?.message === 'string'
        ? raw.message
        : typeof raw?.error === 'string'
          ? raw.error
          : USER_MESSAGES.UPLOAD_SERVICE_FAILED
    throw new ErrorWithStatus({
      message: msg,
      status: HTTP_STATUS.BAD_GATEWAY
    })
  }

  if (!raw || raw.success !== true || typeof raw.url !== 'string' || typeof raw.id !== 'string') {
    throw new ErrorWithStatus({
      message: USER_MESSAGES.UPLOAD_SERVICE_FAILED,
      status: HTTP_STATUS.BAD_GATEWAY
    })
  }

  return {
    success: true,
    url: raw.url,
    thumb: typeof raw.thumb === 'string' ? raw.thumb : '',
    id: raw.id,
    size: typeof raw.size === 'number' ? raw.size : 0,
    aspect_ratio: typeof raw.aspect_ratio === 'number' ? raw.aspect_ratio : 0,
    forumImage: { objectKey: raw.id, url: raw.url }
  }
}

export type DocumentWorkerItem = {
  success: boolean
  url: string
  id: string
  name: string
  size: number
  mimeType: string
}

function getDocumentWorkerConfig() {
  const explicitUrl = process.env.DOCUMENT_WORKER_SERVICE_API?.trim()
  const imageUrl = process.env.IMAGE_WORKER_SERVICE_API?.trim()
  // Fallback: worker thường expose cả /documents cùng host với image upload.
  // Nếu chưa set DOCUMENT_WORKER_SERVICE_API nhưng có IMAGE_WORKER_SERVICE_API,
  // tự suy ra bằng cách thêm /documents vào cuối (bỏ slash cuối nếu có).
  const uploadUrl =
    explicitUrl || (imageUrl ? `${imageUrl.replace(/\/+$/, '')}/documents` : '')
  const apiKey =
    process.env.DOCUMENT_WORKER_SERVICE_KEY?.trim() ||
    process.env.IMAGE_WORKER_SERVICE_KEY?.trim()
  if (!uploadUrl || !apiKey) {
    throw new ErrorWithStatus({
      message: USER_MESSAGES.DOCUMENT_UPLOAD_SERVICE_NOT_CONFIGURED,
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR
    })
  }
  return { uploadUrl, apiKey }
}

async function uploadOneDocumentToWorker(file: Express.Multer.File): Promise<DocumentWorkerItem> {
  const { uploadUrl, apiKey } = getDocumentWorkerConfig()
  const form = new FormData()
  const blob = new Blob([new Uint8Array(file.buffer)], {
    type: file.mimetype || 'application/octet-stream'
  })
  form.append('documents', blob, file.originalname || 'document.pdf')

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: form
  })

  const raw = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok) {
    const msg =
      typeof raw?.message === 'string'
        ? raw.message
        : typeof raw?.error === 'string'
          ? raw.error
          : USER_MESSAGES.DOCUMENT_UPLOAD_SERVICE_FAILED
    throw new ErrorWithStatus({
      message: msg,
      status: HTTP_STATUS.BAD_GATEWAY
    })
  }

  const urlOk = raw && typeof raw.url === 'string'
  const successOk = raw?.success === true || raw?.success === undefined
  if (!urlOk || !successOk) {
    throw new ErrorWithStatus({
      message: USER_MESSAGES.DOCUMENT_UPLOAD_SERVICE_FAILED,
      status: HTTP_STATUS.BAD_GATEWAY
    })
  }

  const docUrl = raw.url as string

  const id =
    typeof raw.id === 'string'
      ? raw.id
      : typeof raw.objectKey === 'string'
        ? raw.objectKey
        : docUrl

  return {
    success: true,
    url: docUrl,
    id,
    name: typeof raw.name === 'string' ? raw.name : file.originalname || '',
    size: typeof raw.size === 'number' ? raw.size : file.size,
    mimeType: typeof raw.mimeType === 'string' ? raw.mimeType : file.mimetype || ''
  }
}

export class UploadService {
  async uploadImages(files: Express.Multer.File[]) {
    const items = await Promise.all(files.map((f) => uploadOneToWorker(f)))
    return { items }
  }

  async uploadDocuments(files: Express.Multer.File[]) {
    const items = await Promise.all(files.map((f) => uploadOneDocumentToWorker(f)))
    return { items }
  }
}

const uploadService = new UploadService()
export default uploadService
