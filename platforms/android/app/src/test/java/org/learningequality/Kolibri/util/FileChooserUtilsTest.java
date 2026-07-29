package org.learningequality.Kolibri.util;

import static org.junit.Assert.assertArrayEquals;

import android.webkit.MimeTypeMap;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.Shadows;
import org.robolectric.shadows.ShadowMimeTypeMap;

@RunWith(RobolectricTestRunner.class)
public class FileChooserUtilsTest {

  @Before
  public void setUp() {
    ShadowMimeTypeMap mimeTypeMap = Shadows.shadowOf(MimeTypeMap.getSingleton());
    mimeTypeMap.clearMappings();
    // The mapping Android really ships for .csv — notably not text/csv.
    mimeTypeMap.addExtensionMimeTypeMapping("csv", "text/comma-separated-values");
  }

  @Test
  public void resolvesExtensionsToTheTypeDocumentProvidersReport() {
    assertArrayEquals(
        new String[] {"text/comma-separated-values"},
        FileChooserUtils.toPickerMimeTypes(new String[] {".csv"}));
  }

  @Test
  public void keepsMimeTypesAndResolvesExtensionsTogether() {
    assertArrayEquals(
        new String[] {"text/csv", "text/comma-separated-values"},
        FileChooserUtils.toPickerMimeTypes(new String[] {"text/csv", ".csv"}));
  }

  @Test
  public void keepsWildcardMimeTypes() {
    assertArrayEquals(
        new String[] {"image/*"}, FileChooserUtils.toPickerMimeTypes(new String[] {"image/*"}));
  }

  @Test
  public void dedupesRepeatedAndDifferentlyCasedEntries() {
    assertArrayEquals(
        new String[] {"text/comma-separated-values"},
        FileChooserUtils.toPickerMimeTypes(new String[] {".csv", ".CSV", ".csv"}));
  }

  @Test
  public void fallsBackToGenericTypeForUnknownExtensions() {
    assertArrayEquals(
        new String[] {"application/octet-stream"},
        FileChooserUtils.toPickerMimeTypes(new String[] {".unknownext"}));
  }

  @Test
  public void allowsEverythingWhenNothingUsableWasRequested() {
    assertArrayEquals(new String[] {"*/*"}, FileChooserUtils.toPickerMimeTypes(null));
    assertArrayEquals(new String[] {"*/*"}, FileChooserUtils.toPickerMimeTypes(new String[0]));
    assertArrayEquals(
        new String[] {"*/*"}, FileChooserUtils.toPickerMimeTypes(new String[] {"", "  ", null}));
  }
}
