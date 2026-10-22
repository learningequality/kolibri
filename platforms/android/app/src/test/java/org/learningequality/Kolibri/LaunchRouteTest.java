package org.learningequality.Kolibri;

import static org.junit.Assert.assertEquals;
import static org.learningequality.Kolibri.discovery.DiscoveredServers.server;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.learningequality.Kolibri.discovery.DiscoveredServer;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class LaunchRouteTest {

  private static final DiscoveredServer LIBRARY = server("abc", "Library", "192.168.1.20");
  private static final DiscoveredServer LAB = server("def", "Lab", "192.168.1.30");

  @Test
  public void aLocalSelectionStaysLocalWhateverIsNearby() {
    LaunchRoute route = LaunchRoute.of(ServerSelection.LOCAL, Arrays.asList(LIBRARY, LAB));

    assertEquals(LaunchRoute.Kind.LOCAL, route.getKind());
  }

  @Test
  public void noSelectionAndNothingNearbyGoesLocal() {
    LaunchRoute route = LaunchRoute.of(null, Collections.emptyList());

    assertEquals(LaunchRoute.Kind.LOCAL, route.getKind());
  }

  @Test
  public void noSelectionAndOneServerNearbyGoesToIt() {
    LaunchRoute route = LaunchRoute.of(null, Collections.singletonList(LIBRARY));

    assertEquals(LaunchRoute.Kind.REMOTE, route.getKind());
    assertEquals(LIBRARY, route.getServer());
  }

  @Test
  public void noSelectionAndSeveralServersNearbyOffersThemAll() {
    List<DiscoveredServer> nearby = Arrays.asList(LIBRARY, LAB);

    LaunchRoute route = LaunchRoute.of(null, nearby);

    assertEquals(LaunchRoute.Kind.PICK, route.getKind());
    assertEquals(nearby, route.getServers());
  }

  @Test
  public void aSelectedServerIsFollowedToItsNewAddress() {
    DiscoveredServer moved = server("abc", "Library", "192.168.1.99");

    LaunchRoute route = LaunchRoute.of("abc", Arrays.asList(LAB, moved));

    assertEquals(LaunchRoute.Kind.REMOTE, route.getKind());
    assertEquals("http://192.168.1.99:8080/", route.getServer().getBaseUrl());
  }

  @Test
  public void aSelectedServerThatIsNotNearbyIsUnreachable() {
    LaunchRoute route = LaunchRoute.of("abc", Collections.singletonList(LAB));

    assertEquals(LaunchRoute.Kind.UNREACHABLE, route.getKind());
  }
}
