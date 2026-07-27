package org.learningequality.Kolibri.util;

import android.webkit.MimeTypeMap;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

/** Translates web file input metadata into the inputs Android's file pickers expect. */
public final class FileChooserUtils {

  private static final String ALL_TYPES = "*/*";
  private static final String GENERIC_TYPE = "application/octet-stream";

  private FileChooserUtils() {}

  /**
   * Converts a file input's {@code accept} entries into picker MIME types, or a wildcard when none
   * are usable. A literal ".csv" in {@code EXTRA_MIME_TYPES} matches nothing and greys out every
   * file; document providers type files from their extension via {@link MimeTypeMap}, so resolving
   * through that same map is what makes them selectable.
   */
  public static String[] toPickerMimeTypes(String[] acceptTypes) {
    if (acceptTypes == null) {
      return new String[] {ALL_TYPES};
    }
    Set<String> mimeTypes = new LinkedHashSet<>();
    for (String acceptType : acceptTypes) {
      if (acceptType == null) {
        continue;
      }
      String type = acceptType.trim().toLowerCase(Locale.US);
      if (type.startsWith(".")) {
        String mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(type.substring(1));
        // An unmapped extension resolves to the generic type on both sides, so files still match.
        mimeTypes.add(mimeType != null ? mimeType : GENERIC_TYPE);
      } else if (type.contains("/")) {
        mimeTypes.add(type);
      }
    }
    return mimeTypes.isEmpty() ? new String[] {ALL_TYPES} : mimeTypes.toArray(new String[0]);
  }
}
