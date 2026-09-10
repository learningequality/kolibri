Feature: kolibri-server manages ports correctly
  If the user changes the port after installing kolibri-server, those changes must be applied upon restart. This test should be done in Debian Buster and Ubuntu bionic.

  Background:
    Given that the kolibri-server is installed and running

  Scenario: Change Kolibri port
    When I edit the file '~/.kolibri/options.ini' to change the HTTP_PORT option to one of the allowed options: 80, 8008 or 8080
      And I restart kolibri-server
      And I reload the browser with the new port
    Then I see Kolibri running with the new port
