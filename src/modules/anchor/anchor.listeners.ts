import { domainEvents, DomainEventName, type SeasonChangedEventPayload } from '~/events/domain-events'
import prisma from '~/lib/prisma'

const handleSeasonDataChanged = async ({ seasonId }: SeasonChangedEventPayload) => {
  const latestAnchor = await prisma.season_anchors.findFirst({
    where: {
      season_id: seasonId
    },
    orderBy: {
      checkpoint_no: 'desc'
    },
    select: {
      id: true
    }
  })

  // Chỉ đánh dấu amended khi season đã từng có ít nhất 1 checkpoint.
  if (latestAnchor == null) {
    return
  }

  await prisma.seasons.updateMany({
    where: {
      id: seasonId,
      status: {
        not: 'amended'
      }
    },
    data: {
      status: 'amended',
      sealed_at: null
    }
  })
}

export const registerAnchorEventListeners = () => {
  domainEvents.on(DomainEventName.DIARY_CREATED, handleSeasonDataChanged)
  domainEvents.on(DomainEventName.DIARY_UPDATED, handleSeasonDataChanged)
  domainEvents.on(DomainEventName.DIARY_DELETED, handleSeasonDataChanged)
  domainEvents.on(DomainEventName.ATTACHMENT_ADDED, handleSeasonDataChanged)
  domainEvents.on(DomainEventName.ATTACHMENT_DELETED, handleSeasonDataChanged)
  domainEvents.on(DomainEventName.SEASON_UPDATED, handleSeasonDataChanged)
}
