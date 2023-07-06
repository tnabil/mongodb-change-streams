const dbname = "applications";
const collection = "auditlog";

use(dbname);

// Insert a few documents into the sales collection.
db.getCollection(collection).insertOne([
    { created: new Date() },
]);