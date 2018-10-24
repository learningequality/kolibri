Feature: Super Admin profile manage command
    Super Admin needs to have profile logs of the server running Kolibri

  Background:
    Given that the Kolibri server is running
      And super admin has open a terminal in the Operative System

  Scenario: A terminal is open in the same machine where Kolibri is running
    Given that I have access to the kolibri command line
    When I enter <kolibri manage profile --num_samples=6>
      And I look at the KOLIBRI_HOME/performance directory (Usually $HOME/.kolibri/performance)
    Then I see a xxxxxxxx_xxxxxx_performance.csv file, where xxxxxxxx_xxxxxx is current date and time, example 20181022_194415_performance.csv
    When I use the browser to navigate through kolibri pages
      And I look at the KOLIBRI_HOME/performance directory (Usually $HOME/.kolibri/performance)
    Then I see another file called xxxxxxxx_xxxxxx_requests_performance.csv, where xxxxxxxx_xxxxxx is the same date and time shown in the previous file
    When 1 minutes pass
    Then I see again the prompt in the terminal and performance.csv and requests_performance.csv files don't change anymore.
    When I open performance.csv with a text editor or with a Spreadsheet application
    Then I check it has at least 60 lines beginning with a timestamp and several numbers per line. First line is a header with the name of the fields
    When I open requests_performance.csvwith a text editor
    Then I check it has at least one line per Kolibri page I have visited in the browser. Each lines begins with a timestamp and has several numbers.

