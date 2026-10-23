package org.learningequality.Kolibri;

import android.app.Activity;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.button.MaterialButton;
import java.util.Collections;
import java.util.List;
import org.learningequality.Kolibri.discovery.DiscoveredServer;

final class ServerSheet {

  interface Listener {
    void onLocal();

    void onRemote(DiscoveredServer server);

    void onSearch();
  }

  private final String localLabel;
  private final Listener listener;
  private final BottomSheetDialog dialog;
  private final LinearLayout list;
  private final View progress;
  private final TextView status;
  private final View connectNearby;
  private List<DiscoveredServer> servers = Collections.emptyList();
  @Nullable private String selection;

  ServerSheet(Activity activity, @StringRes int localLabel, boolean cancelable, Listener listener) {
    this.localLabel = activity.getString(localLabel);
    this.listener = listener;
    dialog = new BottomSheetDialog(activity);
    dialog.setContentView(R.layout.sheet_servers);
    dialog.setTitle(R.string.server_sheet_title);
    dialog.setCancelable(cancelable);
    list = dialog.findViewById(R.id.server_list);
    progress = dialog.findViewById(R.id.server_progress);
    status = dialog.findViewById(R.id.server_status);
    connectNearby = dialog.findViewById(R.id.server_connect_nearby);
    connectNearby.setOnClickListener(v -> listener.onSearch());
  }

  /**
   * @param selection {@link ServerSelection#LOCAL} or a server's {@code instance_id} to mark that
   *     row; {@code null} to mark none
   */
  void show(@Nullable String selection) {
    this.selection = selection;
    renderRows();
    dialog.show();
  }

  void setSearching() {
    progress.setVisibility(View.VISIBLE);
    connectNearby.setVisibility(View.GONE);
    status.setText(R.string.server_sheet_searching);
  }

  /**
   * @param servers {@code null} when the search could not run
   */
  void showFound(@Nullable List<DiscoveredServer> servers) {
    if (servers == null) {
      setServers(Collections.emptyList());
      status.setText(R.string.server_search_failed);
    } else {
      setServers(servers);
    }
  }

  void setServers(List<DiscoveredServer> servers) {
    this.servers = servers;
    progress.setVisibility(View.GONE);
    connectNearby.setVisibility(servers.isEmpty() ? View.VISIBLE : View.GONE);
    status.setText(
        servers.isEmpty()
            ? dialog.getContext().getString(R.string.server_sheet_none_found)
            : dialog
                .getContext()
                .getResources()
                .getQuantityString(R.plurals.server_sheet_found, servers.size(), servers.size()));
    renderRows();
  }

  void dismiss() {
    dialog.dismiss();
  }

  private void renderRows() {
    list.removeAllViews();
    boolean localSelected = ServerSelection.LOCAL.equals(selection);
    addRow(localLabel, localSelected, listener::onLocal);
    for (DiscoveredServer server : servers) {
      addRow(
          server.getDeviceName(),
          server.getInstanceId().equals(selection),
          () -> listener.onRemote(server));
    }
  }

  private void addRow(String name, boolean selected, Runnable onPick) {
    MaterialButton row =
        (MaterialButton)
            LayoutInflater.from(dialog.getContext()).inflate(R.layout.item_server, list, false);
    row.setText(name);
    row.setSelected(selected);
    if (selected) {
      row.setIconResource(R.drawable.ic_check);
    }
    row.setOnClickListener(
        v -> {
          dialog.dismiss();
          onPick.run();
        });
    list.addView(row);
  }
}
