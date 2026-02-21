package org.learningequality.Kolibri.util;

import android.content.Context;
import android.content.SharedPreferences;
import java.security.SecureRandom;
import org.learningequality.Kolibri.R;

/**
 * Utility for OS user authentication. Provides persistent auth token storage and validation. Called
 * from Python via Chaquopy and from Java.
 */
public class AuthUtils {
  private static final String PREFS_NAME = "kolibri_auth";
  private static final String KEY_AUTH_TOKEN = "os_user_auth_token";
  // Legacy P4A storage: file in .value_cache directory
  private static final String LEGACY_CACHE_DIR = ".value_cache";
  private static final String LEGACY_CACHE_KEY = "OS_USER_AUTH_TOKEN";
  private static final int TOKEN_BYTES = 16; // 16 bytes = 32 hex chars
  private static final char[] HEX_CHARS = "0123456789abcdef".toCharArray();

  /**
   * Get or create a persistent auth token for the OS user. Token persists across app restarts via
   * SharedPreferences. Migrates from legacy P4A file-based storage if needed.
   *
   * @return The auth token (32 character hex string)
   */
  public static synchronized String getOrCreateAuthToken() {
    Context context = ContextUtil.getApplicationContext();
    SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

    String token = prefs.getString(KEY_AUTH_TOKEN, null);
    if (token == null) {
      // Check legacy P4A file-based storage for migration
      token = migrateLegacyToken(context, prefs);
    }
    if (token == null) {
      // Generate new token
      byte[] tokenBytes = new byte[TOKEN_BYTES];
      new SecureRandom().nextBytes(tokenBytes);
      token = bytesToHex(tokenBytes);
      prefs.edit().putString(KEY_AUTH_TOKEN, token).apply();
    }
    return token;
  }

  /**
   * Migrate token from legacy P4A file-based storage (.value_cache/OS_USER_AUTH_TOKEN). The old P4A
   * version used AndroidValueCache which stored values as files. Returns the migrated token, or
   * null if no legacy token exists.
   */
  private static String migrateLegacyToken(Context context, SharedPreferences newPrefs) {
    java.io.File externalFilesDir = context.getExternalFilesDir(null);
    if (externalFilesDir == null) {
      return null;
    }
    java.io.File legacyFile =
        new java.io.File(new java.io.File(externalFilesDir, LEGACY_CACHE_DIR), LEGACY_CACHE_KEY);
    if (!legacyFile.exists()) {
      return null;
    }
    try (java.io.BufferedReader reader =
        new java.io.BufferedReader(new java.io.FileReader(legacyFile))) {
      String legacyToken = reader.readLine();
      if (legacyToken != null && !legacyToken.isEmpty()) {
        legacyToken = legacyToken.trim();
        // Migrate to SharedPreferences
        newPrefs.edit().putString(KEY_AUTH_TOKEN, legacyToken).commit();
        // Delete legacy file
        legacyFile.delete();
        return legacyToken;
      }
    } catch (java.io.IOException e) {
      // Ignore - will generate new token
    }
    return null;
  }

  private static String bytesToHex(byte[] bytes) {
    char[] hexChars = new char[bytes.length * 2];
    for (int i = 0; i < bytes.length; i++) {
      int v = bytes[i] & 0xFF;
      hexChars[i * 2] = HEX_CHARS[v >>> 4];
      hexChars[i * 2 + 1] = HEX_CHARS[v & 0x0F];
    }
    return new String(hexChars);
  }

  /**
   * Validate an auth token.
   *
   * @param token The token to validate
   * @return true if token matches the stored token
   */
  public static boolean validateAuthToken(String token) {
    return token != null && token.equals(getOrCreateAuthToken());
  }

  /**
   * Get the localized username for the OS user.
   *
   * @return Localized "Learner" string
   */
  public static String getLocalizedUsername() {
    return ContextUtil.getApplicationContext().getString(R.string.os_user_name);
  }
}
