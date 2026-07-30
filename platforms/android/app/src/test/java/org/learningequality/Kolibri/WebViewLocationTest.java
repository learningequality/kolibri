package org.learningequality.Kolibri;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;

@RunWith(RobolectricTestRunner.class)
public class WebViewLocationTest {

  private static final String PAGE_URL = "http://127.0.0.1:46655/en/facility/?token=x#/data/import";
  private static final String PAGE_PATH = "/en/facility/?token=x#/data/import";

  private Context context;

  @Before
  public void setUp() {
    context = RuntimeEnvironment.getApplication();
  }

  @Test
  public void save_recordsThePathAndPortOfALoopbackPage() {
    WebViewLocation.save(context, PAGE_URL);

    assertEquals(PAGE_PATH, WebViewLocation.getLastPath(context));
    assertEquals(46655, WebViewLocation.getLastPort());
  }

  /** A link opened out to the browser, or a blank/error document, must not become the target. */
  @Test
  public void save_ignoresAnythingThatIsNotOneOfOurPages() {
    WebViewLocation.save(context, PAGE_URL);

    WebViewLocation.save(context, "https://learningequality.org/");
    WebViewLocation.save(context, "data:text/html,<p>hi</p>");
    WebViewLocation.save(context, null);

    assertEquals(PAGE_PATH, WebViewLocation.getLastPath(context));
    assertEquals(46655, WebViewLocation.getLastPort());
  }

  /** Recognised by path, so a later visit with a fresh token is skipped too. */
  @Test
  public void save_ignoresTheAppInitializeUrlTheActivityLoaded() {
    WebViewLocation.save(context, PAGE_URL);
    WebViewLocation.noteInitializeUrl(
        "http://127.0.0.1:46655/api/device/initialize/abc?auth_token=t&next=%2Fen%2Ffacility%2F");

    WebViewLocation.save(
        context,
        "http://127.0.0.1:46655/api/device/initialize/abc?auth_token=u&next=%2Fen%2Flearn%2F");

    assertEquals(PAGE_PATH, WebViewLocation.getLastPath(context));
    assertEquals(46655, WebViewLocation.getLastPort());
  }

  @Test
  public void isSameOrigin_isTrueForTheSamePort() {
    assertTrue(
        WebViewLocation.isSameOrigin(
            "http://127.0.0.1:46655/en/learn/#/home",
            "http://127.0.0.1:46655/api/device/initialize/abc?next=%2Fen%2Flearn%2F"));
  }

  @Test
  public void isSameOrigin_isFalseForADifferentPort() {
    assertFalse(
        WebViewLocation.isSameOrigin(
            "http://127.0.0.1:46655/en/learn/", "http://127.0.0.1:45791/en/learn/"));
  }

  @Test
  public void isSameOrigin_isFalseWithoutASchemeAndAuthority() {
    assertFalse(WebViewLocation.isSameOrigin(null, "http://127.0.0.1:46655/"));
    assertFalse(WebViewLocation.isSameOrigin("about:blank", "http://127.0.0.1:46655/"));
  }
}
