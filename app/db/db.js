import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL || "";
let client;

export async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
  }
  return client.db('Test');
}

