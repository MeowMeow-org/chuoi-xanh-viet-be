import type { Prisma } from '@prisma/client'

export interface SeasonAnchorParams {
  season_id: string
}

export interface SeasonCheckpointParams extends SeasonAnchorParams {
  checkpoint_no: string
}

export interface CreateCheckpointRequestBody {
  checkpointType?: string
  isFinal?: boolean
  payloadRange?: Prisma.InputJsonValue | null
}
