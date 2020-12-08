Feature: Admin export usage data
  Admin needs to be able to export session and summary logs for the facility

  Background:
    Given The user is signed in to Kolibri as a facility admin user
      And The user is on *Facility > Data* page
      And The learners have had interactions with the content on the device

  Scenario: Export session logs
    When The user clicks on "Generate log file" link under *Session logs* heading
    Then The user sees the loading indicator
      And The *Download* button is enabled
      And The text change to "Generate a new log file"
    When The user clicks on *Download* button
    Then The user sees the *Open/Save as* window, or the file 'content_session_logs.csv' is automatically saved on his/her local drive, depending on the browser defaults

  Scenario: Export summary logs
    When The user clicks on "Generate log file" link under *Summary logs* heading
    Then The user sees the loading indicator
      And The *Download* button is enabled
      And The text change to "Generate a new log file"
    When The user clicks on *Download* button
    Then The user sees the *Open/Save as* window, or the file 'content_summary_logs.csv' is automatically saved on his/her local drive, depending on the browser defaults
