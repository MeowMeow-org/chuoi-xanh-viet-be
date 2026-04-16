import type { forum_post_status } from '@prisma/client'

export interface ForumPostImageInput {
  objectKey: string
  url: string
}

export interface CreateForumPostBody {
  title: string
  content: string
  labels: string[]
  images?: ForumPostImageInput[]
}

export interface UpdateForumPostBody {
  title?: string
  content?: string
  labels?: string[]
  images?: ForumPostImageInput[]
  status?: forum_post_status
}

export interface GetForumPostsQuery {
  page?: string
  limit?: string
  label?: string
  searchTerm?: string
}

export interface CreateForumCommentBody {
  content: string
}

export interface UpdateForumCommentBody {
  content: string
}
