import { NextResponse, type NextRequest } from 'next/server';
import { getAllTreksFromDb, createTrekInDb, seedTreksCollection, type FullTrek } from '@/lib/treks';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase().trim();
    const section = searchParams.get('section')?.trim();

    // Auto seed default treks if DB collection is empty
    await seedTreksCollection(false).catch(() => null);

    let treks = await getAllTreksFromDb();

    if (search) {
      treks = treks.filter(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          t.slug.toLowerCase().includes(search) ||
          t.origin.toLowerCase().includes(search) ||
          t.region?.toLowerCase().includes(search)
      );
    }

    if (section && section !== 'all') {
      treks = treks.filter((t) => t.sections?.includes(section));
    }

    return NextResponse.json({ treks });
  } catch (error) {
    console.error('Error fetching admin treks:', error);
    return NextResponse.json({ error: 'Failed to fetch treks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const inputData: Omit<FullTrek, '_id' | 'id'> = {
      slug: body.slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''),
      name: body.name.trim(),
      origin: body.origin?.trim() || 'Himalayas',
      days: Number(body.days) || 1,
      difficulty: body.difficulty || 'Easy',
      image: body.image || '/treks-cards-images/kedarkantha-trek.jpg',
      note: body.note?.trim(),
      sections: Array.isArray(body.sections) ? body.sections : ['winter-treks'],
      region: body.region?.trim(),
      maxAltitude: body.maxAltitude?.trim(),
      trekkingKm: body.trekkingKm?.trim(),
      pickupPoint: body.pickupPoint?.trim(),
      dropPoint: body.dropPoint?.trim(),
      baseCamp: body.baseCamp?.trim(),
      food: body.food?.trim(),
      stay: body.stay?.trim(),
      bestSeason: body.bestSeason?.trim(),
      priceStrikethrough: body.priceStrikethrough?.trim(),
      pricePerPerson: body.pricePerPerson?.trim(),
      priceNote: body.priceNote?.trim(),
      discountBadge: body.discountBadge?.trim(),
      pdfUrl: body.pdfUrl?.trim(),
      gallery: Array.isArray(body.gallery) && body.gallery.length > 0 ? body.gallery : [body.image],
      highlights: Array.isArray(body.highlights) ? body.highlights : [],
      whoCanParticipate: Array.isArray(body.whoCanParticipate) ? body.whoCanParticipate : [],
      itinerary: Array.isArray(body.itinerary) ? body.itinerary : [],
    };

    const newTrek = await createTrekInDb(inputData);
    return NextResponse.json({ trek: newTrek }, { status: 201 });
  } catch (error) {
    console.error('Error creating trek:', error);
    return NextResponse.json({ error: 'Failed to create trek' }, { status: 500 });
  }
}
