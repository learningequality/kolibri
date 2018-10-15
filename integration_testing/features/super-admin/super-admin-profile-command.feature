Feature: Super Admin profile manage command
    Super Admin needs to have profile logs of the server running Kolibri

  Background:
    Given that the Kolibri server is running
      And super admin has open a terminal in the Operative System

  Scenario: Kolibri running from source code
    Given that I have the terminal open
      And I have followed the needed steps to build Kolibri and have it running
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


  Scenario: Kolibri running in Windows after using the Windows Installer
    Given that I have the terminal open
      And I use the File Browser to find the folder where Python is installed
    When I type <cd> in the terminal
      And drag the folder where Python is installed to drop it in the terminal
    Then I see something similar to <cd c:\Python3.4> in the terminal
    When I press Enter
    Then I see the prompt indicates I am into that folder
    When I enter <cd Scripts> to enter into the folder where Kolibri script exists
    Then I see the prompt indicates I am into the Scripts folder
    When I enter <kolibri manage profile --num_samples=6>
    Then Two new log files appear in the KOLIBRI_HOME (Usually c:\Documents and Settings\$USER/.kolibri) performance.log and requests_performance.log
    When I use the browser to navigate through kolibri pages
    Then I see new data appearing in requests_performance.log
    When 1 minutes pass
    Then I see again the prompt in the terminal and performance.log and requests_performance.log don't change anymore.
    When I open performance.log with a text editor
    Then I check it has at least 60 lines beginning with a timestamp and several numbers per line
    When I open requests_performance.log with a text editor
    Then I check it has at least one line per Kolibri page I have visited in the browser. Each lines begins with a timestamp and has several numbers.

    Scenario: Kolibri running in Linux or Mac after using pip, the deb package or the Mac installer
      Given that I have the terminal open
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

