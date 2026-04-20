import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { syncApplicationStatuses } from '@/lib/openclaw/syncer';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run syncer in background or wait
    await syncApplicationStatuses(session.user.id);

    return NextResponse.json({ success: true, message: 'Status sync complete' });
  } catch (error: any) {
    console.error('[openclaw/sync POST]', error);
    return NextResponse.json({ error: 'Failed to sync statuses' }, { status: 500 });
  }
}
