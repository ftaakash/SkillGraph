import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionData, targetRoles, preferredCities, ctcLpa } = await req.json();

    const existingConfig = await prisma.openClawConfig.findUnique({
      where: { userId: session.user.id }
    });

    const mergedSessionData = {
      ...(existingConfig?.sessionData as object || {}),
      ...(sessionData || {})
    };

    const config = await prisma.openClawConfig.upsert({
      where: { userId: session.user.id },
      update: {
        sessionData: mergedSessionData,
        targetRoles: targetRoles || undefined,
        preferredCities: preferredCities || undefined,
        minCtcLpa: ctcLpa || undefined,
      },
      create: {
        userId: session.user.id,
        sessionData: sessionData || {},
        targetRoles: targetRoles || ['Software Engineer'],
        preferredCities: preferredCities || ['Remote'],
        minCtcLpa: ctcLpa || 3.0,
      }
    });

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('[openclaw/config PATCH]', error);
    return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
  }
}
