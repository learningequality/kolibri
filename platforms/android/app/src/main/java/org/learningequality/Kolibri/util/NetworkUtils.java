package org.learningequality.Kolibri.util;

import android.content.Context;
import android.net.ConnectivityManager;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class NetworkUtils {

  /**
   * Check if the active network connection is metered. Called from Python via Chaquopy.
   *
   * @return true if metered, false otherwise
   */
  public static boolean isActiveNetworkMetered() {
    Context context = ContextUtil.getApplicationContext();
    ConnectivityManager cm =
        (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
    return cm != null && cm.isActiveNetworkMetered();
  }

  public static List<String> getActiveIPv4Addresses() {
    List<String> ipAddresses = new ArrayList<>();

    List<NetworkInterface> networkInterfaces;
    try {
      networkInterfaces = Collections.list(NetworkInterface.getNetworkInterfaces());
    } catch (SocketException e) {
      e.printStackTrace();
      return ipAddresses; // Return empty list if there's a problem fetching network interfaces
    }

    for (NetworkInterface networkInterface : networkInterfaces) {
      try {
        // Check if the network interface is up (active)
        if (!networkInterface.isUp() || !networkInterface.supportsMulticast()) {
          continue; // Skip inactive interfaces, and interfaces that don't support multicast
        }

        // Get all IP addresses associated with the interface
        List<InetAddress> inetAddresses = Collections.list(networkInterface.getInetAddresses());

        for (InetAddress inetAddress : inetAddresses) {
          // Ensure this is an IPv4 address
          if (inetAddress instanceof Inet4Address) {
            ipAddresses.add(inetAddress.getHostAddress());
          }
        }
      } catch (SocketException e) {
        e.printStackTrace(); // Handle or log the error for this particular network interface
        // Continue with the next interface
      }
    }

    return ipAddresses;
  }
}
