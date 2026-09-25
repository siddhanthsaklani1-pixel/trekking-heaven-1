import { NextResponse, type NextRequest } from 'next/server';
import { getTrekByIdFromDb, updateTrekInDb, deleteTrekFromDb } from '@/lib/treks';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const trek = await getTrekByIdFromDb(id);
    if (!trek) {
      return NextResponse.json({ error: 'Trek not found' }, { status: 404 });
    }
    return NextResponse.json({ trek });
  } catch (error) {
    console.error(`Error fetching trek ${params}:`, error);
    return NextResponse.json({ error: 'Failed to fetch trek' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();

    const success = await updateTrekInDb(id, body);
    if (!success) {
      return NextResponse.json({ error: 'Trek not found or could not be updated' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error updating trek:`, error);
    return NextResponse.json({ error: 'Failed to update trek' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const success = await deleteTrekFromDb(id);

    if (!success) {
      return NextResponse.json({ error: 'Trek not found or could not be deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting trek:', error);
    return NextResponse.json({ error: 'Failed to delete trek' }, { status: 500 });
  }
}
