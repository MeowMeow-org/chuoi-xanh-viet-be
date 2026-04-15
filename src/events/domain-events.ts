import { EventEmitter } from 'events'

export const DomainEventName = {
  DIARY_CREATED: 'DIARY_CREATED',
  DIARY_UPDATED: 'DIARY_UPDATED',
  DIARY_DELETED: 'DIARY_DELETED',
  ATTACHMENT_ADDED: 'ATTACHMENT_ADDED',
  ATTACHMENT_DELETED: 'ATTACHMENT_DELETED',
  SEASON_UPDATED: 'SEASON_UPDATED'
} as const

export type DomainEventNameValue = (typeof DomainEventName)[keyof typeof DomainEventName]

export interface SeasonChangedEventPayload {
  seasonId: string
}

export const domainEvents = new EventEmitter()
domainEvents.setMaxListeners(50)
