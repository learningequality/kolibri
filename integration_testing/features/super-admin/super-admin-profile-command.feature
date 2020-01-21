Feature: Super Admin runs manage profile command
    Super Admin needs to be able to generate and review profile logs on the device running Kolibri

  Background:
    Given that the Kolibri server is running
      And the '[Server]' section of the Kolibri's "options.ini" file is configured with 'PROFILE = 1' to enable request profiling

  Scenario: Execute the profile command and review the created "_performance.csv" file
    When I run the 'kolibri manage profile --num-samples=6' command in the Terminal
      And I browse the "KOLIBRI_HOME/performance folder"      # Usually $HOME/.kolibri/performance
    Then I see a "xxxxxxxx_xxxxxx_performance.csv" file       # xxxxxxxx_xxxxxx is current date_time, for example 20181022_194415_performance.csv

  Scenario: Add more interactions and review the created "_requests_performance.csv" file 
    When I interact with Kolibri in the browser by navigating through other server pages for at least 1 minute
      And I browse the "KOLIBRI_HOME/performance" folder again
    Then I see another file called "xxxxxxxx_xxxxxx_requests_performance.csv"
      And it has the same date_time as the "xxxxxxxx_xxxxxx_performance.csv" file

  Scenario: Stop interacting with server and observe profiling results 
    Given that 1 minute has passed after running the command 
    When I see the prompt in the Terminal again # Profiling requests is finished, and CSV files stop changing
    Then I open CSV files in a text editor or a spreadsheet application
      And I see that "xxxxxxxx_xxxxxx_performance.csv" file has at least 6 lines beginning with a timestamp followed by profiling results # First line is a header
      And I see that "xxxxxxxx_xxxxxx_requests_performance.csv" file has at least one line per each Kolibri page I interacted with in the browser, and lines begin with a timestamp followed by requests profiling results
      