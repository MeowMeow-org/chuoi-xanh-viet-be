export interface CreateChatConversationBody {
  peerUserId: string
}

export interface SendChatMessageBody {
  content: string
}

export interface GetChatMessagesQuery {
  page?: string
  limit?: string
}
