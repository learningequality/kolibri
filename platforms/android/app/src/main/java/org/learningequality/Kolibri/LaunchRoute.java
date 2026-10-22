package org.learningequality.Kolibri;

import java.util.Collections;
import java.util.List;
import org.learningequality.Kolibri.discovery.DiscoveredServer;

final class LaunchRoute {
  enum Kind {
    LOCAL,
    REMOTE,
    PICK,
    UNREACHABLE
  }

  private final Kind kind;
  private final List<DiscoveredServer> servers;

  private LaunchRoute(Kind kind, List<DiscoveredServer> servers) {
    this.kind = kind;
    this.servers = servers;
  }

  static LaunchRoute of(String selection, List<DiscoveredServer> eligible) {
    if (ServerSelection.LOCAL.equals(selection)) {
      return new LaunchRoute(Kind.LOCAL, Collections.emptyList());
    }
    if (selection != null) {
      for (DiscoveredServer server : eligible) {
        if (selection.equals(server.getInstanceId())) {
          return new LaunchRoute(Kind.REMOTE, Collections.singletonList(server));
        }
      }
      return new LaunchRoute(Kind.UNREACHABLE, Collections.emptyList());
    }
    switch (eligible.size()) {
      case 0:
        return new LaunchRoute(Kind.LOCAL, Collections.emptyList());
      case 1:
        return new LaunchRoute(Kind.REMOTE, eligible);
      default:
        return new LaunchRoute(Kind.PICK, eligible);
    }
  }

  Kind getKind() {
    return kind;
  }

  /** The server to load for {@link Kind#REMOTE}. */
  DiscoveredServer getServer() {
    return servers.get(0);
  }

  /** The servers to offer for {@link Kind#PICK}. */
  List<DiscoveredServer> getServers() {
    return servers;
  }
}
