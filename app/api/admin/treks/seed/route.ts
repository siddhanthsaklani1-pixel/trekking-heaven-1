import { NextResponse } from 'next/server';
import { seedTreksCollection } from '@/lib/treks';

export async function POST() {
  try {
    const result = await seedTreksCollection(true);
    return NextResponse.json({ success: true, seededCount: result.count });
  } catch (error) {
    console.error('Error seeding treks:', error);
    return NextResponse.json({ error: 'Failed to seed default treks' }, { status: 500 });
  }
}
