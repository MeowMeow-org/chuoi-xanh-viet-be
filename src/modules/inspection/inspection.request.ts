export type InspectionVerdict = 'pass' | 'fail' | 'needs_work'

export interface CreateInspectionRequestBody {
  seasonId: string
  verdict: InspectionVerdict
  summary?: string
  eventDate?: string
  attachments?: Array<{
    objectKey?: string
    fileUrl: string
    mimeType?: string | null
    sortOrder?: number
  }>
}

export interface ListInspectionsQuery {
  seasonId?: string
}
