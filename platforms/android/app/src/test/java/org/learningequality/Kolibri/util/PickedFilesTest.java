package org.learningequality.Kolibri.util;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;

/** The picker's own URI is stood in for by a provider that can be made to stop serving it. */
@RunWith(RobolectricTestRunner.class)
public class PickedFilesTest {
  private static final Uri PICKED_URI = Uri.parse("content://test.picker/document/1");

  @Rule public TemporaryFolder pickerStorage = new TemporaryFolder();

  private Context context;

  @Before
  public void setUp() {
    context = RuntimeEnvironment.getApplication();
    Robolectric.setupContentProvider(FakePickerProvider.class, "test.picker");
    FakePickerProvider.displayName = "users.csv";
    FakePickerProvider.backing = null;
  }

  /**
   * One test, not three: FileProvider resolves its roots once per authority and holds them, while
   * Robolectric gives every test method its own data directory, so a second method that reached the
   * provider would be resolving against the first method's paths.
   */
  @Test
  public void aPickedFileIsOursToUploadFromTheMomentItIsPicked() throws IOException {
    FakePickerProvider.backing = fileContaining("username,full_name\nlearner,Learner\n");

    Uri copy = PickedFiles.copyToPrivateCache(context, PICKED_URI);

    // Named for what the picker showed, which is the name the page puts in front of the user.
    assertEquals("users.csv", displayNameOf(copy));
    assertEquals("username,full_name\nlearner,Learner\n", contentOf(copy));

    // What the upload used to run into: by submit time the picking app no longer serves the URI.
    FakePickerProvider.backing = null;
    assertEquals("username,full_name\nlearner,Learner\n", contentOf(copy));

    FakePickerProvider.displayName = "other.csv";
    FakePickerProvider.backing = fileContaining("username\nother\n");
    Uri secondCopy = PickedFiles.copyToPrivateCache(context, PICKED_URI);

    assertEquals("username\nother\n", contentOf(secondCopy));
    // Picking again drops the previous copy rather than leaving it in the cache.
    assertEquals(1, new File(context.getCacheDir(), "picked").listFiles().length);
  }

  /** No URI means the page reports no file chosen, rather than one that cannot be uploaded. */
  @Test
  public void anUnreadablePickedFileYieldsNothing() {
    assertNull(PickedFiles.copyToPrivateCache(context, PICKED_URI));
  }

  private File fileContaining(String content) throws IOException {
    File file = pickerStorage.newFile();
    Files.write(file.toPath(), content.getBytes(StandardCharsets.UTF_8));
    return file;
  }

  private String contentOf(Uri uri) throws IOException {
    try (InputStream in = context.getContentResolver().openInputStream(uri)) {
      return new String(in.readAllBytes(), StandardCharsets.UTF_8);
    }
  }

  /** The name the WebView reports to the page for the file it was handed. */
  private String displayNameOf(Uri uri) {
    try (Cursor cursor =
        context
            .getContentResolver()
            .query(uri, new String[] {OpenableColumns.DISPLAY_NAME}, null, null, null)) {
      cursor.moveToFirst();
      return cursor.getString(0);
    }
  }

  public static class FakePickerProvider extends ContentProvider {
    static File backing;
    static String displayName;

    @Override
    public boolean onCreate() {
      return true;
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String sel, String[] args, String order) {
      MatrixCursor cursor = new MatrixCursor(new String[] {OpenableColumns.DISPLAY_NAME});
      cursor.addRow(new Object[] {displayName});
      return cursor;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
      if (backing == null) {
        throw new FileNotFoundException(uri.toString());
      }
      return ParcelFileDescriptor.open(backing, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public String getType(Uri uri) {
      return "text/csv";
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
      throw new UnsupportedOperationException();
    }

    @Override
    public int delete(Uri uri, String selection, String[] args) {
      throw new UnsupportedOperationException();
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] args) {
      throw new UnsupportedOperationException();
    }
  }
}
