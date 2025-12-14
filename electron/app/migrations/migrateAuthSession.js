/**
 * Migration: auth/session.json v1 → v2
 *
 * Migration rules:
 * - Rename subscriptionExpiry → planExpiry
 * - Add lastLoginAt if missing (use current ISO timestamp)
 * - Preserve all existing unknown fields
 * - Add _schemaVersion: 2
 * - Must be idempotent
 */

const TARGET_FILE = "auth/session.json";
const CURRENT_VERSION = 2;

export const migrateAuthSession = async (readJson, writeJson) => {
  try {
    // Read existing data with defaultToObject: true
    const data = await readJson(TARGET_FILE, { defaultToObject: true });

    // Detect schema version (missing _schemaVersion → assume v1)
    const currentVersion = data._schemaVersion ?? 1;

    // Skip if already at or above target version
    if (currentVersion >= CURRENT_VERSION) {
      return { migrated: false, version: currentVersion };
    }

    // Perform v1 → v2 migration
    const migrated = { ...data };

    // Rename subscriptionExpiry → planExpiry (if exists)
    if (migrated.subscriptionExpiry !== undefined) {
      migrated.planExpiry = migrated.subscriptionExpiry;
      delete migrated.subscriptionExpiry;
    }

    // Add lastLoginAt if missing
    if (!migrated.lastLoginAt) {
      migrated.lastLoginAt = new Date().toISOString();
    }

    // Set schema version
    migrated._schemaVersion = CURRENT_VERSION;

    // Write updated data back
    await writeJson(TARGET_FILE, migrated);

    console.log(`[migration] Migrated ${TARGET_FILE} from v${currentVersion} to v${CURRENT_VERSION}`);

    return { migrated: true, version: CURRENT_VERSION };
  } catch (error) {
    console.error(`[migration] Failed to migrate ${TARGET_FILE}:`, error);
    // Don't throw - allow app to continue even if migration fails
    return { migrated: false, error: error.message };
  }
};

