Feature: Super admin receives the notification to upgrade Kolibri
    Super admin needs to be able to temporarily or permanently dismiss the upgrade notification

  Background:
    Given I am signed in to Kolibri as super admin
      And I see the upgrade notification message

  Scenario: Trigger a notification
    When I set KOLIBRI_RUN_MODE to "msg-[string]" where `[string]` is any string of letters and numbers
      And I start the server
      And I log in
    Then I should get a notification

  Scenario: Trigger a different notification
    When I set KOLIBRI_RUN_MODE to a different  "msg-[string]"
      And I start the server
      And I log in
    Then I should get a different notification

  Scenario: Temporarily dismiss notification
    When I click *OK*
    Then the notification closes
    When I sign out
      And I sign back in
    Then I see the upgrade notification again

  Scenario: Permanently dismiss notification
    When I check *Do not show again* box
      And I click *OK*
    Then the notification closes
    When I sign out
      And I sign back in
    Then I don't see the upgrade notification

  Scenario: Upgrade Kolibri through the link inside notification message
    When I click on the upgrade link
    Then I download the most recent Kolibri installer
    When I finish the Kolibri upgrade
      And I sign back in
    Then I don't see the upgrade notification
