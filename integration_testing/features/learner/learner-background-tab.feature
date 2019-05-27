Feature: Learner stays logged in
  Learner's session remains active even if tab is in the background

  Background:
    Given I am signed in as a learner user
      And I am on *Learn > Classes* page

  Scenario: Browser window is minimized
    When I minimize my browser window
     And I wait 30 minutes
     And I come back to the browser
    Then I see I am still logged in

  Scenario: Tab is not currently active
    When I open a new tab in the same window and go to a different web site
     And I wait 30 minutes
     And I reopen the tab with Kolibri
    Then I see I am still logged in
