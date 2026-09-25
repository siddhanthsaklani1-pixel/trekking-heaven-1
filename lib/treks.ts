import { ObjectId, type Filter } from 'mongodb';
import { getDb } from './mongodb';
import { trekSections, type Trek, type TrekSection } from './trek-data';
import { detailBySlug, type TrekDetail, type ItineraryDay } from './trek-detail-data';

export const TREKS_COLLECTION = 'treks';

export interface FullTrek extends Omit<TrekDetail, 'id'> {
  id?: string;
  _id?: string;
  sections?: string[]; // e.g. ['winter-treks', 'upcoming-treks']
  createdAt?: string;
  updatedAt?: string;
}

/** Merges hardcoded trekSections and detailBySlug into a single list of full treks */
export function getDefaultTreks(): FullTrek[] {
  const trekMap = new Map<string, FullTrek>();

  trekSections.forEach((section) => {
    section.treks.forEach((basicTrek) => {
      const slug = basicTrek.slug;
      const existing = trekMap.get(slug);
      const detail = detailBySlug[slug] || {};

      if (existing) {
        if (!existing.sections?.includes(section.id)) {
          existing.sections?.push(section.id);
        }
      } else {
        trekMap.set(slug, {
          ...basicTrek,
          ...detail,
          slug,
          sections: [section.id],
          gallery: detail.gallery || [basicTrek.image],
        });
      }
    });
  });

  return Array.from(trekMap.values());
}

/** Gets all treks from MongoDB or fallback to hardcoded list */
export async function getAllTreksFromDb(): Promise<FullTrek[]> {
  try {
    const db = await getDb();
    const docs = (await db.collection(TREKS_COLLECTION).find({}).toArray()) as any[];

    if (docs && docs.length > 0) {
      return docs.map((doc) => ({
        ...doc,
        _id: doc._id ? doc._id.toString() : undefined,
      }));
    }
  } catch (error) {
    console.warn('MongoDB connection unavailable for getAllTreksFromDb, using fallback.', error);
  }

  return getDefaultTreks();
}

/** Seeds default treks into MongoDB if collection is empty or forced */
export async function seedTreksCollection(force = false): Promise<{ count: number }> {
  const db = await getDb();
  const collection = db.collection(TREKS_COLLECTION);
  const count = await collection.countDocuments({});

  if (count > 0 && !force) {
    return { count };
  }

  if (force) {
    await collection.deleteMany({});
  }

  const defaultTreks = getDefaultTreks();
  const now = new Date().toISOString();

  const docsToInsert = defaultTreks.map((trek) => {
    const doc = { ...trek } as Record<string, any>;
    delete doc.id;
    delete doc._id;
    return {
      ...doc,
      createdAt: now,
      updatedAt: now,
    };
  });

  const result = await collection.insertMany(docsToInsert as any[]);
  return { count: result.insertedCount };
}

/** Get single trek by slug */
export async function getTrekBySlugFromDb(slug: string): Promise<FullTrek | null> {
  try {
    const db = await getDb();
    const doc = (await db.collection(TREKS_COLLECTION).findOne({ slug })) as any;
    if (doc) {
      return {
        ...doc,
        _id: doc._id ? doc._id.toString() : undefined,
      };
    }
  } catch (error) {
    console.warn(`MongoDB lookup failed for slug: ${slug}, using fallback.`, error);
  }

  const defaults = getDefaultTreks();
  return defaults.find((t) => t.slug === slug) || null;
}

/** Get single trek by ID */
export async function getTrekByIdFromDb(id: string): Promise<FullTrek | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const doc = (await db.collection(TREKS_COLLECTION).findOne({ _id: new ObjectId(id) })) as any;
  if (!doc) return null;
  return {
    ...doc,
    _id: doc._id ? doc._id.toString() : undefined,
  };
}

/** Create a new trek in MongoDB */
export async function createTrekInDb(input: Omit<FullTrek, '_id' | 'id'>): Promise<FullTrek> {
  const db = await getDb();
  const now = new Date().toISOString();

  const docToInsert = {
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection(TREKS_COLLECTION).insertOne(docToInsert);
  return {
    ...docToInsert,
    id: result.insertedId.toString(),
    _id: result.insertedId.toString(),
  };
}

/** Update an existing trek in MongoDB */
export async function updateTrekInDb(id: string, updates: Partial<FullTrek>): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDb();
  const cleanUpdates = { ...updates } as Record<string, any>;
  delete cleanUpdates._id;
  delete cleanUpdates.id;

  const result = await db.collection(TREKS_COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...cleanUpdates,
        updatedAt: new Date().toISOString(),
      },
    }
  );

  return result.matchedCount > 0;
}

/** Delete a trek from MongoDB */
export async function deleteTrekFromDb(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDb();
  const result = await db.collection(TREKS_COLLECTION).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

/** Reconstruct TrekSections array dynamically for site homepage and category listings */
export async function getDynamicTrekSections(): Promise<TrekSection[]> {
  const allTreks = await getAllTreksFromDb();

  return trekSections.map((section) => {
    const matchingTreks = allTreks
      .filter((t) => t.sections?.includes(section.id))
      .map((t) => ({
        id: t._id || t.id || t.slug,
        slug: t.slug,
        name: t.name,
        origin: t.origin || 'Himalayas',
        days: t.days || 1,
        difficulty: t.difficulty || 'Easy',
        image: t.image || '/treks-cards-images/kedarkantha-trek.jpg',
        note: t.note,
      }));

    return {
      ...section,
      treks: matchingTreks,
    };
  });
}
