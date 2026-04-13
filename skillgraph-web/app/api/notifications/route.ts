import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { ok, unauthorized, serverError } from '@/lib/api'
import { NextRequest } from 'next/server'

// GET — fetch unread notifications for current user
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const user = session.user as { id?: string }
    if (!user.id) return unauthorized()

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const unreadCount = notifications.filter(n => !n.isRead).length
    return ok({ notifications, unreadCount })
  } catch (err) {
    console.error('[notifications GET]', err)
    return serverError()
  }
}

// PATCH — mark all as read
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return unauthorized()
    const user = session.user as { id?: string }
    if (!user.id) return unauthorized()

    const body = await req.json().catch(() => ({}))
    const { notificationId } = body

    if (notificationId) {
      await prisma.notification.updateMany({
        where: { id: notificationId, userId: user.id },
        data: { isRead: true },
      })
    } else {
      // Mark all read
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      })
    }

    return ok({ success: true })
  } catch (err) {
    console.error('[notifications PATCH]', err)
    return serverError()
  }
}
