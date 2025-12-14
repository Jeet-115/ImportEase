/**
 * Migration runner
 *
 * Sequentially runs all migrations in order.
 * Safe to call multiple times (idempotent).
 */

import { migrateAuthSession } from "./migrateAuthSession.js";

/**
 * Run all migrations
 * @param {Function} readJson - File service readJson function
 * @param {Function} writeJson - File service writeJson function
 * @returns {Promise<Object>} Summary of migration results
 */
export const runMigrations = async (readJson, writeJson) => {
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    details: [],
  };

  try {
    // Run migrations in order
    const migrations = [
      { name: "auth/session.json", fn: migrateAuthSession },
      // Future migrations can be added here:
      // { name: "other/file.json", fn: migrateOtherFile },
    ];

    results.total = migrations.length;

    for (const migration of migrations) {
      try {
        const result = await migration.fn(readJson, writeJson);
        results.details.push({
          file: migration.name,
          ...result,
        });

        if (result.migrated) {
          results.successful++;
        } else if (result.error) {
          results.failed++;
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          file: migration.name,
          migrated: false,
          error: error.message,
        });
        console.error(`[migration] Error in ${migration.name}:`, error);
      }
    }

    if (results.successful > 0) {
      console.log(
        `[migration] Completed: ${results.successful} migrated, ${results.failed} failed`
      );
    }

    return results;
  } catch (error) {
    console.error("[migration] Fatal error during migration:", error);
    return results;
  }
};

