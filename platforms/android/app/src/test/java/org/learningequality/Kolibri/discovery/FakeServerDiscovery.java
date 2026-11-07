package org.learningequality.Kolibri.discovery;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;

public final class FakeServerDiscovery extends ServerDiscovery {

  private final List<Consumer<List<DiscoveredServer>>> pending = new ArrayList<>();
  private int calls;
  private String awaitedInstanceId;

  public FakeServerDiscovery() {
    super(null, null, null, null);
  }

  @Override
  public void discover(String awaitedInstanceId, Consumer<List<DiscoveredServer>> callback) {
    calls++;
    this.awaitedInstanceId = awaitedInstanceId;
    pending.add(callback);
  }

  public int calls() {
    return calls;
  }

  public String awaitedInstanceId() {
    return awaitedInstanceId;
  }

  public void answer(DiscoveredServer... servers) {
    complete(Arrays.asList(servers));
  }

  public void fail() {
    complete(null);
  }

  private void complete(List<DiscoveredServer> result) {
    List<Consumer<List<DiscoveredServer>>> callbacks = new ArrayList<>(pending);
    pending.clear();
    for (Consumer<List<DiscoveredServer>> callback : callbacks) {
      callback.accept(result);
    }
  }
}
