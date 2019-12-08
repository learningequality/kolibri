Feature: Admin export usage data
  Admin needs to be able to export session and summary logs for the facility

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am on *Facility > Data* page
      And the learners have had interactions with the content on the device

  Scenario: Export session logs
    When I click on "Generate log file" link under *Session logs* heading
    Then I see the loading indicator
      And the *Download* button is enabled
      And the text change to "Generate a new log file" 
    When I click on *Download* button     
    Then I see the *Open/Save as* window, or the file 'content_session_logs.csv' is automatically saved on my local drive, depending on the browser defaults

  Scenario: Export summary logs
    When I click on "Generate log file" link under *Summary logs* heading
    Then I see the loading indicator
      And the *Download* button is enabled
      And the text change to "Generate a new log file"
    When I click on *Download* button 
    Then I see the *Open/Save as* window, or the file 'content_summary_logs.csv' is automatically saved on my local drive, depending on the browser defaults
