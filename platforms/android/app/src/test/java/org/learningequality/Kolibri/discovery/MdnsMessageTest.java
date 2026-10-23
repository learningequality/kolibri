package org.learningequality.Kolibri.discovery;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;
import static org.learningequality.Kolibri.discovery.ZeroconfFixtures.KITCHEN;
import static org.learningequality.Kolibri.discovery.ZeroconfFixtures.LIBRARY;
import static org.learningequality.Kolibri.discovery.ZeroconfFixtures.LIBRARY_RESPONSE;
import static org.learningequality.Kolibri.discovery.ZeroconfFixtures.PRINTER;
import static org.learningequality.Kolibri.discovery.ZeroconfFixtures.PTR_QUERY;
import static org.learningequality.Kolibri.discovery.ZeroconfFixtures.PTR_RESPONSE;
import static org.learningequality.Kolibri.discovery.ZeroconfFixtures.TABLET;
import static org.learningequality.Kolibri.discovery.ZeroconfFixtures.bytes;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.Test;

public class MdnsMessageTest {

  private static MdnsMessage parse(String hex) {
    byte[] data = bytes(hex);
    return MdnsMessage.parse(data, data.length);
  }

  @Test
  public void query_matchesTheQueryZeroconfSends() {
    assertArrayEquals(
        bytes(PTR_QUERY), MdnsMessage.query(ServerDiscovery.SERVICE_NAME, MdnsMessage.TYPE_PTR));
  }

  @Test
  public void parse_readsTheInstanceNamesOfAPtrAnswer() {
    MdnsMessage message = parse(PTR_RESPONSE);

    assertTrue(message.isResponse());
    List<String> targets = new ArrayList<>();
    for (MdnsMessage.Record record : message.getRecords()) {
      assertEquals(MdnsMessage.TYPE_PTR, record.getType());
      assertEquals(ServerDiscovery.SERVICE_NAME, record.getName());
      targets.add(record.getTarget());
    }
    assertEquals(Arrays.asList(LIBRARY, KITCHEN, TABLET, PRINTER), targets);
  }

  @Test
  public void parse_rejectsATruncatedPacket() {
    byte[] data = bytes(LIBRARY_RESPONSE);

    assertThrows(IllegalArgumentException.class, () -> MdnsMessage.parse(data, data.length - 3));
  }

  @Test
  public void parse_rejectsANameThatPointsAtItself() {
    byte[] data = bytes("000000000001000000000000" + "c00c" + "000c0001");

    assertThrows(IllegalArgumentException.class, () -> MdnsMessage.parse(data, data.length));
  }

  @Test
  public void parse_rejectsANamePointingBackToItsOwnLabel() {
    byte[] data =
        bytes("000084000000000100000000" + "0161c00c" + "000c0001" + "00000000" + "0000");

    assertThrows(IllegalArgumentException.class, () -> MdnsMessage.parse(data, data.length));
  }
}
