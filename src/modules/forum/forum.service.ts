import { forum_post_status, Prisma } from '@prisma/client'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { isAllowedForumLabel } from '~/constants/forum-labels'
import prisma from '~/lib/prisma'
import { ErrorWithStatus } from '~/models/Errors'
import { notificationDispatch } from '~/modules/notification/notification.dispatch'
import type {
  CreateForumCommentBody,
  CreateForumPostBody,
  ForumPostImageInput,
  GetForumPostsQuery,
  UpdateForumCommentBody,
  UpdateForumPostBody
} from './forum.request'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20

function normalizeLabels(labels: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of labels) {
    const slug = raw.trim()
    if (!slug || !isAllowedForumLabel(slug) || seen.has(slug)) continue
    seen.add(slug)
    out.push(slug)
  }
  return out
}

const MAX_FORUM_POST_IMAGES = 3

function normalizeForumPostImages(images: ForumPostImageInput[] | undefined) {
  if (!images?.length) return []
  if (images.length > MAX_FORUM_POST_IMAGES) {
    throw new ErrorWithStatus({
      message: USER_MESSAGES.FORUM_IMAGES_INVALID,
      status: HTTP_STATUS.BAD_REQUEST
    })
  }
  return images.map((img, sort_order) => ({
    object_key: img.objectKey.trim(),
    file_url: img.url.trim(),
    sort_order
  }))
}

export class ForumService {
  async createPost(authorUserId: string, body: CreateForumPostBody) {
    const labels = normalizeLabels(body.labels)
    if (labels.length === 0) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.FORUM_LABELS_INVALID,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const imageRows = normalizeForumPostImages(body.images)

    const post = await prisma.forum_posts.create({
      data: {
        author_user_id: authorUserId,
        title: body.title.trim(),
        content: body.content.trim(),
        forum_post_labels: {
          create: labels.map((label) => ({ label }))
        },
        ...(imageRows.length > 0
          ? {
              forum_post_images: {
                create: imageRows
              }
            }
          : {})
      },
      include: {
        forum_post_labels: true,
        forum_post_images: { orderBy: { sort_order: 'asc' } },
        users: { select: { id: true, full_name: true, role: true } },
        _count: { select: { forum_comments: true } }
      }
    })

    return this.mapPost(post)
  }

  async getPosts(query: GetForumPostsQuery) {
    const page = Number(query.page ?? DEFAULT_PAGE)
    const limit = Number(query.limit ?? DEFAULT_LIMIT)
    const safePage = Number.isFinite(page) && page > 0 ? page : DEFAULT_PAGE
    const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 100 ? limit : DEFAULT_LIMIT
    const skip = (safePage - 1) * safeLimit
    const label = typeof query.label === 'string' ? query.label.trim() : undefined
    const searchTerm = typeof query.searchTerm === 'string' ? query.searchTerm.trim() : undefined

    const where: Prisma.forum_postsWhereInput = {
      status: forum_post_status.active,
      ...(label && isAllowedForumLabel(label) ? { forum_post_labels: { some: { label } } } : {}),
      ...(searchTerm
        ? {
            OR: [
              { title: { contains: searchTerm, mode: 'insensitive' } },
              { content: { contains: searchTerm, mode: 'insensitive' } }
            ]
          }
        : {})
    }

    const [items, total] = await Promise.all([
      prisma.forum_posts.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { created_at: 'desc' },
        include: {
          forum_post_labels: true,
          forum_post_images: { orderBy: { sort_order: 'asc' } },
          users: { select: { id: true, full_name: true, role: true } },
          _count: { select: { forum_comments: true } }
        }
      }),
      prisma.forum_posts.count({ where })
    ])

    return {
      items: items.map((p) => this.mapPost(p)),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit)
      }
    }
  }

  async getPostById(postId: string, viewerUserId: string, viewerRole: string) {
    const post = await prisma.forum_posts.findUnique({
      where: { id: postId },
      include: {
        forum_post_labels: true,
        forum_post_images: { orderBy: { sort_order: 'asc' } },
        users: { select: { id: true, full_name: true, role: true } },
        _count: { select: { forum_comments: true } }
      }
    })

    if (!post) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.FORUM_POST_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const isAuthor = post.author_user_id === viewerUserId
    const isAdmin = viewerRole === 'admin'

    if (post.status === forum_post_status.hidden && !isAuthor && !isAdmin) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.FORUM_POST_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    return this.mapPost(post)
  }

  async updatePost(postId: string, userId: string, role: string, body: UpdateForumPostBody) {
    const post = await prisma.forum_posts.findUnique({ where: { id: postId } })
    if (!post) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.FORUM_POST_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const isAuthor = post.author_user_id === userId
    const isAdmin = role === 'admin'

    if (!isAuthor && !isAdmin) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.FORUM_FORBIDDEN_NOT_AUTHOR,
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    if (body.status !== undefined && !isAdmin) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.FORUM_ONLY_ADMIN_CAN_CHANGE_STATUS,
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    const hasFieldUpdate =
      body.title !== undefined ||
      body.content !== undefined ||
      body.labels !== undefined ||
      body.images !== undefined ||
      body.status !== undefined
    if (!hasFieldUpdate) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.FORUM_PATCH_EMPTY,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const data: Prisma.forum_postsUpdateInput = {}
    if (body.title !== undefined) data.title = body.title.trim()
    if (body.content !== undefined) data.content = body.content.trim()
    if (body.status !== undefined) data.status = body.status

    let labelCreates: { label: string }[] | undefined
    if (body.labels !== undefined) {
      const labels = normalizeLabels(body.labels)
      if (labels.length === 0) {
        throw new ErrorWithStatus({
          message: USER_MESSAGES.FORUM_LABELS_INVALID,
          status: HTTP_STATUS.BAD_REQUEST
        })
      }
      labelCreates = labels.map((label) => ({ label }))
    }

    let imageRows: ReturnType<typeof normalizeForumPostImages> | undefined
    if (body.images !== undefined) {
      imageRows = normalizeForumPostImages(body.images)
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (labelCreates) {
        await tx.forum_post_labels.deleteMany({ where: { post_id: postId } })
        await tx.forum_post_labels.createMany({
          data: labelCreates.map((row) => ({ post_id: postId, label: row.label }))
        })
      }

      if (imageRows !== undefined) {
        await tx.forum_post_images.deleteMany({ where: { post_id: postId } })
        if (imageRows.length > 0) {
          await tx.forum_post_images.createMany({
            data: imageRows.map((row) => ({ post_id: postId, ...row }))
          })
        }
      }

      return tx.forum_posts.update({
        where: { id: postId },
        data,
        include: {
          forum_post_labels: true,
          forum_post_images: { orderBy: { sort_order: 'asc' } },
          users: { select: { id: true, full_name: true, role: true } },
          _count: { select: { forum_comments: true } }
        }
      })
    })

    return this.mapPost(updated)
  }

  async deletePost(postId: string, userId: string, role: string) {
    const post = await prisma.forum_posts.findUnique({ where: { id: postId } })
    if (!post) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.FORUM_POST_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const isAuthor = post.author_user_id === userId
    const isAdmin = role === 'admin'

    if (!isAuthor && !isAdmin) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.FORUM_FORBIDDEN_NOT_AUTHOR,
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    await prisma.forum_posts.delete({ where: { id: postId } })
    return { success: true }
  }

  async createComment(postId: string, authorUserId: string, body: CreateForumCommentBody) {
    const post = await prisma.forum_posts.findUnique({ where: { id: postId } })
    if (!post || post.status === forum_post_status.hidden) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.FORUM_POST_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (post.status === forum_post_status.locked) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.FORUM_POST_LOCKED_NO_COMMENTS,
        status: HTTP_STATUS.CONFLICT
      })
    }

    const comment = await prisma.forum_comments.create({
      data: {
        post_id: postId,
        author_user_id: authorUserId,
        content: body.content.trim()
      },
      include: {
        users: { select: { id: true, full_name: true, role: true } }
      }
    })

    if (post.author_user_id !== authorUserId) {
      notificationDispatch.forumNewComment({
        postAuthorUserId: post.author_user_id,
        commentAuthorUserId: authorUserId,
        commentAuthorName: comment.users.full_name.trim() || 'Thành viên',
        postId,
        postTitle: post.title
      })
    }

    return this.mapComment(comment)
  }

  async getComments(postId: string, query: { page?: string | number; limit?: string | number }) {
    const post = await prisma.forum_posts.findUnique({ where: { id: postId } })
    if (!post) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.FORUM_POST_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const page = Number(query.page ?? DEFAULT_PAGE)
    const limit = Number(query.limit ?? DEFAULT_LIMIT)
    const safePage = Number.isFinite(page) && page > 0 ? page : DEFAULT_PAGE
    const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 100 ? limit : DEFAULT_LIMIT
    const skip = (safePage - 1) * safeLimit

    const where = { post_id: postId }

    const [items, total] = await Promise.all([
      prisma.forum_comments.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { created_at: 'asc' },
        include: {
          users: { select: { id: true, full_name: true, role: true } }
        }
      }),
      prisma.forum_comments.count({ where })
    ])

    return {
      items: items.map((c) => this.mapComment(c)),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit)
      }
    }
  }

  async updateComment(commentId: string, userId: string, body: UpdateForumCommentBody) {
    const comment = await prisma.forum_comments.findUnique({ where: { id: commentId } })
    if (!comment) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.FORUM_COMMENT_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (comment.author_user_id !== userId) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.FORUM_FORBIDDEN_NOT_COMMENT_AUTHOR,
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    const updated = await prisma.forum_comments.update({
      where: { id: commentId },
      data: { content: body.content.trim() },
      include: {
        users: { select: { id: true, full_name: true, role: true } }
      }
    })

    return this.mapComment(updated)
  }

  async deleteComment(commentId: string, userId: string, role: string) {
    const comment = await prisma.forum_comments.findUnique({ where: { id: commentId } })
    if (!comment) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.FORUM_COMMENT_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const isAuthor = comment.author_user_id === userId
    const isAdmin = role === 'admin'

    if (!isAuthor && !isAdmin) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.FORUM_FORBIDDEN_NOT_COMMENT_AUTHOR,
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    await prisma.forum_comments.delete({ where: { id: commentId } })
    return { success: true }
  }

  private mapPost(post: {
    id: string
    author_user_id: string
    title: string
    content: string
    status: forum_post_status
    created_at: Date
    updated_at: Date
    forum_post_labels: { label: string }[]
    forum_post_images: {
      id: string
      object_key: string
      file_url: string
      sort_order: number
    }[]
    users: { id: string; full_name: string; role: string }
    _count: { forum_comments: number }
  }) {
    return {
      id: post.id,
      authorUserId: post.author_user_id,
      title: post.title,
      content: post.content,
      status: post.status,
      labels: post.forum_post_labels.map((l) => l.label),
      images: post.forum_post_images.map((img) => ({
        id: img.id,
        objectKey: img.object_key,
        url: img.file_url,
        sortOrder: img.sort_order
      })),
      commentCount: post._count.forum_comments,
      author: {
        id: post.users.id,
        fullName: post.users.full_name,
        role: post.users.role
      },
      createdAt: post.created_at,
      updatedAt: post.updated_at
    }
  }

  private mapComment(comment: {
    id: string
    post_id: string
    author_user_id: string
    content: string
    created_at: Date
    updated_at: Date
    users: { id: string; full_name: string; role: string }
  }) {
    return {
      id: comment.id,
      postId: comment.post_id,
      authorUserId: comment.author_user_id,
      content: comment.content,
      author: {
        id: comment.users.id,
        fullName: comment.users.full_name,
        role: comment.users.role
      },
      createdAt: comment.created_at,
      updatedAt: comment.updated_at
    }
  }
}

const forumService = new ForumService()
export default forumService
