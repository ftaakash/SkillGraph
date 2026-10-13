import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/log'

type Note = { type: string; title: string; body: string; link?: string | null }

/** In-app notifications to many users; failures are logged, never fail the action that caused them. */
export async function notifyUsers(userIds: string[], note: Note) {
  const ids = [...new Set(userIds)]
  try {
    for (let i = 0; i < ids.length; i += 1000) {
      await prisma.notification.createMany({
        data: ids.slice(i, i + 1000).map(userId => ({
          userId,
          type: note.type,
          title: note.title.slice(0, 200),
          body: note.body.slice(0, 2000),
          link: note.link ?? null,
        })),
      })
    }
  } catch (err) {
    logger.error('notifications.failed', { count: ids.length, error: err instanceof Error ? err.message : String(err) })
  }
}
