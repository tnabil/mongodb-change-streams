import * as mongo from "mongodb";
import dotenv from "dotenv"

let client: mongo.MongoClient;

(async function () {
  dotenv.config();
  let cursor1: mongo.ChangeStream;
  let cursor2: mongo.ChangeStream;
  try {
    const db: mongo.Db = await connect();
    if (db) {
      const collection: mongo.Collection = db.collection(config("COLLECTION_NAME"));

      // first cursor
      cursor1 = collection.watch(
        [
          {
            $match: {
              "operationType": { $in: ["insert", "update", "replace"] }
            }
          },
          {
            $project: {
              "_id": 1,
              "fullDocument": 1,
              "ns": 1,
              "documentKey": 1,
            }
          }
        ],
        {
          fullDocument: "updateLookup",
          batchSize: parseInt(config("BATCH_SIZE")),
        }
      );

      // change id of first inserted document
      let firstChangeId;
      let count1 = 1;

      // attach listener
      cursor1.on("change", (change) => {
        console.info(`cursor1 count = ${count1}`);
        if (count1 == 1)
          firstChangeId = change["_id"];
        console.info(`change:\n ${JSON.stringify(change, null, 2)}`);
        console.info(`change._id._data:\n ${change["_id"]["_data"]}`);
        console.info(`cursor1.resumeToken._data:\n ${cursor1.resumeToken["_data"]}`);
        count1++;
      });

      console.info("Insert first batch of records now...");
      await delay(30 * 1000);

      // close cursor1
      await cursor1.close();
      console.info("Closed cursor1\n\n");

      console.info(`Creating second cursor with ID:\n${firstChangeId["_data"]}`);

      // second cursor
      cursor2 = collection.watch(
        [
          { $match: { "operationType": { $in: ["insert", "update", "replace"] } } },
          { $project: { "_id": 1, "fullDocument": 1, "ns": 1, "documentKey": 1 } }
        ],
        {
          fullDocument: "updateLookup",
          resumeAfter: {
            "_data": firstChangeId["_data"],
            "_kind": firstChangeId["_kind"],
          },
          batchSize: parseInt(config("BATCH_SIZE")),
        }
      );

      let count2 = 1;

      // attach listener
      cursor2.on("change", (change) => {
        console.info(`cursor2 count = ${count2}`);
        console.info(`change:\n ${JSON.stringify(change, null, 2)}`);
        console.info(`change._id._data:\n ${change["_id"]["_data"]}`);
        console.info(`cursor2.resumeToken._data:\n ${cursor2.resumeToken["_data"]}`);
        count2++;
      });

      console.info("Insert second batch of records now...");

      await delay(30 * 1000);

      // close cursor
      await cursor2.close();
      console.info("Closed cursor2\n\n");

      // count should be 20
      console.info(`Total cursor2 count = ${--count2}`);

    } else {
      throw new Error('Unable to connect to database, exiting');
    }
  } catch (error) {
    console.error('error:', error);
    throw error;
  } finally {
    if (cursor1 && !cursor1.closed)
      await cursor1.close();
    if (cursor2 && !cursor2.closed)
      cursor2.close();
    close();
  }
})();

async function connect(): Promise<mongo.Db> {
  client = new mongo.MongoClient(config("DATABASE_URL"));
  try {
    await client.connect();
    const db: mongo.Db = client.db(config("DB_NAME"));
    console.info(`Successfully connected to database: ${db.databaseName}`);
    return db;
  } catch (error) {
    console.error('Error connecting to database:', error);
    return null;
  }
}

async function close() {
  try {
    await client.close();
    console.info('closed database connection');
  } catch (error) {
    console.error('error closing the database connection:', error);
  }
}

function config(key: string): string {
  return process.env[key];
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}