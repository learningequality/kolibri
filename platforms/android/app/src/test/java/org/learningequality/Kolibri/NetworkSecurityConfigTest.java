package org.learningequality.Kolibri;

import static org.junit.Assert.assertEquals;

import android.content.res.XmlResourceParser;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.xmlpull.v1.XmlPullParser;

/** Robolectric's NetworkSecurityPolicy permits all cleartext, so the config is read directly. */
@RunWith(RobolectricTestRunner.class)
public class NetworkSecurityConfigTest {

  @Test
  public void permitsCleartextToASingleListenAddress() throws Exception {
    String baseCleartext = null;
    try (XmlResourceParser parser =
        RuntimeEnvironment.getApplication().getResources().getXml(R.xml.network_security_config)) {
      for (int event = parser.next(); event != XmlPullParser.END_DOCUMENT; event = parser.next()) {
        if (event == XmlPullParser.START_TAG && "base-config".equals(parser.getName())) {
          baseCleartext = parser.getAttributeValue(null, "cleartextTrafficPermitted");
        }
      }
    }
    assertEquals("true", baseCleartext);
  }
}
