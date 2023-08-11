Feature: Super admin exports usage data
    Super admin needs to be able to export session and summary logs for the facility

  Background:
    Given I am signed in to Kolibri as a super admin
      And I am on *Facility > Data* page
      And the learners have had interactions with the content on the device

  Scenario: Export session logs
    When I click on the *Generate log* button under *Session logs* heading
    Then I see the *Select a date range* modal
    When I select a start and an end date
    	And I click *Generate*
    Then I see a *Download* button displayed to the left of the *Generate log* button
    When I click on the *Download* button
    Then I see the *Open/Save as* window, or the file 'content_session_logs.csv' is automatically saved on my local drive, depending on the browser defaults

  Scenario: Export summary logs
    When I click on the *Generate log* button under *Summary logs* heading
    Then I see the *Select a date range* modal
    When I select a start and an end date
    	And I click *Generate*
    Then I see a *Download* button displayed to the left of the *Generate log* button
    When I click on the *Download* button
    Then I see the *Open/Save as* window, or the file 'content_session_logs.csv' is automatically saved on my local drive, depending on the browser defaults
