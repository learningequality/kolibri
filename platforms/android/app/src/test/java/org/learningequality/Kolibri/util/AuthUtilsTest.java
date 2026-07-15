package org.learningequality.Kolibri.util;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.SharedPreferences;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;

@RunWith(RobolectricTestRunner.class)
public class AuthUtilsTest {

  private Context context;

  @Before
  public void setUp() {
    context = RuntimeEnvironment.getApplication();
    ContextUtil.init(context);
    // Clear prefs before each test
    context.getSharedPreferences("kolibri_auth", Context.MODE_PRIVATE).edit().clear().commit();
  }

  @Test
  public void migrateLegacyToken_readsTokenFromFile_andPersistsToPrefs() throws IOException {
    // Set up legacy file
    File externalFilesDir = context.getExternalFilesDir(null);
    File cacheDir = new File(externalFilesDir, ".value_cache");
    cacheDir.mkdirs();
    File legacyFile = new File(cacheDir, "OS_USER_AUTH_TOKEN");

    String expectedToken = "abcdef1234567890abcdef1234567890";
    FileWriter writer = new FileWriter(legacyFile);
    writer.write(expectedToken);
    writer.close();

    // Call getOrCreateAuthToken which should migrate
    String token = AuthUtils.getOrCreateAuthToken();

    assertEquals(expectedToken, token);

    // Verify it was persisted to SharedPreferences
    SharedPreferences prefs = context.getSharedPreferences("kolibri_auth", Context.MODE_PRIVATE);
    assertEquals(expectedToken, prefs.getString("os_user_auth_token", null));
  }

  @Test
  public void migrateLegacyToken_deletesLegacyFile_afterPersisting() throws IOException {
    // Set up legacy file
    File externalFilesDir = context.getExternalFilesDir(null);
    File cacheDir = new File(externalFilesDir, ".value_cache");
    cacheDir.mkdirs();
    File legacyFile = new File(cacheDir, "OS_USER_AUTH_TOKEN");

    FileWriter writer = new FileWriter(legacyFile);
    writer.write("abcdef1234567890abcdef1234567890");
    writer.close();

    assertTrue("Legacy file should exist before migration", legacyFile.exists());

    AuthUtils.getOrCreateAuthToken();

    assertFalse("Legacy file should be deleted after migration", legacyFile.exists());
  }

  @Test
  public void getOrCreateAuthToken_generatesNewToken_whenNoLegacyExists() {
    String token = AuthUtils.getOrCreateAuthToken();
    assertNotNull(token);
    assertEquals("Token should be 32 hex chars", 32, token.length());
    assertTrue("Token should be hex", token.matches("[0-9a-f]+"));
  }

  @Test
  public void getOrCreateAuthToken_returnsSameToken_onSubsequentCalls() {
    String token1 = AuthUtils.getOrCreateAuthToken();
    String token2 = AuthUtils.getOrCreateAuthToken();
    assertEquals("Subsequent calls should return same token", token1, token2);
  }
}
