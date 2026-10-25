async function ensureUserIndex(collection) {
  let indexes = [];
  try {
    indexes = await collection.indexes();
  } catch (error) {
    if (error.code !== 26) throw error;
  }
  if (
    indexes.some(
      (index) =>
        index.unique &&
        !index.partialFilterExpression &&
        index.key.email === 1 &&
        Object.keys(index.key).length === 1,
    )
  )
    return;
  try {
    await collection.createIndex(
      { email: 1 },
      { unique: true, name: "email_1" },
    );
  } catch {
    // Never drop a conflicting index, delete duplicates or rewrite legacy addresses.
    throw new Error(
      "A unique users.email index is required. Review duplicate data or conflicting indexes before starting. No accounts were changed.",
    );
  }
}
module.exports = { ensureUserIndex };
