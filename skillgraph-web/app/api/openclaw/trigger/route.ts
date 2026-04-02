import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { processOpenClawAgent } from '@/lib/openclaw/agent';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // In a real app, you'd trigger a Bull job here. 
    // We are awaiting it synchronously to give the user immediate UI feedback.
    await processOpenClawAgent(session.user.id);
    
    return NextResponse.json({ success: true, message: 'Agent execution finished' });
  } catch (error: any) {
    console.error('Trigger agent error:', error);
    return NextResponse.json({ error: error.message || 'Failed to trigger agent' }, { status: 500 });
  }
}
