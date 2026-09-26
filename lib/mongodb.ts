import { MongoClient, type Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'trekkers_heaven';

interface MongoCache {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
}

// Reuse the connection across hot reloads in dev and across invocations
// in serverless environments.
declare global {
  // eslint-disable-next-line no-var
  var _mongoCache: MongoCache | undefined;
}

const cache: MongoCache = global._mongoCache ?? { client: null, promise: null };
if (!global._mongoCache) global._mongoCache = cache;

function isValidMongoUri(uri: string | undefined): boolean {
  if (!uri) return false;
  if (uri.includes('<user>') || uri.includes('<cluster-url>') || uri.includes('<password>')) {
    return false;
  }
  return uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://');
}

export async function getDb(): Promise<Db> {
  if (!isValidMongoUri(MONGODB_URI)) {
    throw new Error(
      'MONGODB_URI is not set or contains placeholder values. Please set a valid MongoDB connection string.'
    );
  }

  if (cache.client) {
    return cache.client.db(MONGODB_DB);
  }

  if (!cache.promise) {
    const client = new MongoClient(MONGODB_URI!, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    cache.promise = client.connect().catch((err) => {
      cache.promise = null;
      throw err;
    });
  }

  cache.client = await cache.promise;
  return cache.client.db(MONGODB_DB);
}
