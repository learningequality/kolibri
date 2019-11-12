Feature: Clean uninstall of kolibri-server
  Kolibri needs to continue running after kolibri-server has been uninstalled. This test should be done in Debian Buster and Ubuntu bionic.

  Background:
    Given that kolibri-server is installed and running

  Scenario: Uninstall kolibri-server
    When I run the 'apt remove kolibri-server' command in the Terminal
	  And the command prompt appears again
    Then I still can access Kolibri in the browser
      And the file /etc/nginx/conf.d/kolibri.conf does not exist
      And the folder /etc/kolibri/nginx.d does not exist
