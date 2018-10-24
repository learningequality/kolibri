Feature: Super Admin profile manage command
    Super Admin needs to have profile logs of the server running Kolibri

  Background:
    Given that the Kolibri server is running
      And super admin has open a terminal in the Operative System

  Scenario: A terminal is open in the same machine where Kolibri is running
    Given that I have access to the kolibri command line
    When I enter <kolibri manage profile --num_samples=6>
    Then Two new log files appear in the KOLIBRI_HOME (Usually $HOME/.kolibri) performance.log and requests_performance.log
    When I use the browser to navigate through kolibri pages
    Then I see new data appearing in requests_performance.log
    When 1 minutes pass
    Then I see again the prompt in the terminal and performance.log and requests_performance.log don't change anymore.
    When I open performance.log with a text editor
    Then I check it has at least 60 lines beginning with a timestamp and several numbers per line
    When I open requests_performance.log with a text editor
    Then I check it has at least one line per Kolibri page I have visited in the browser. Each lines begins with a timestamp and has several numbers.

