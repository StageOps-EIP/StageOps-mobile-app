import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuid } from '@shared/ids';
import { log } from '@infra/logging/log';

const TAG = 'Device';
const STORAGE_KEY = 'device_id';

/** In-memory cache so we only hit AsyncStorage once per session. */
let _cached: string | null = null;

/**
 * Returns a stable device identifier, creating and persisting one on first run.
 *
 * - Backed by AsyncStorage under key `"device_id"`.
 * - Cached in memory after the first call.
 * - Generated with `uuid()` (crypto RNG, RFC 4122 v4).
 *
 * @example
 * const deviceId = await getDeviceId();
 * // '3f6e2b1a-84c5-4d7e-9f0a-1b2c3d4e5f6a'
 */
export async function getDeviceId(): Promise<string> {
  if (_cached) return _cached;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      log.debug(TAG, `Loaded device_id: ${stored}`);
      _cached = stored;
      return stored;
    }
  } catch (err) {
    log.warn(TAG, 'Failed to read device_id from AsyncStorage', err);
  }

  // First run: generate and persist
  const fresh = uuid();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, fresh);
    log.info(TAG, `Generated new device_id: ${fresh}`);
  } catch (err) {
    log.warn(TAG, 'Failed to persist device_id — will regenerate next launch', err);
  }

  _cached = fresh;
  return fresh;
}

/**
 * DEV ONLY — clears the persisted device_id and in-memory cache.
 * Useful for testing first-run behaviour.
 */
export async function resetDeviceId(): Promise<void> {
  _cached = null;
  await AsyncStorage.removeItem(STORAGE_KEY);
  log.warn(TAG, 'device_id reset');
}

