Feature: Stopping kolibri-server service stops kolibri too
  After kolibri-server service is stopped, there should not be any kolibri instances running either. This test should be done in Debian Buster and Ubuntu Bionic.

  Background:
    Given that the kolibri-server is installed and running

  Scenario: Stop kolibri-server
    When I run the 'sudo service kolibri-server stop' command in the Terminal
      And I run 'sudo service kolibri status'
    Then I see the '...Stopped LSB: kolibri daemon...' text in the last line of the output
