Feature: Super admin receives upgrade notification
    Super admin needs to be able to dismiss or click out of notification

  Background:
    Given I am signed in to Kolibri as super admin
      And I see a notification message

  Scenario: Temporarily dismiss notification
    When I click *OK*
    Then the notification goes away
      And I log out
      And I log back in
    Then the notification appears again

  Scenario: Permanently dismiss notification
    When I check *Do not show again* box
    Then I click *OK*
    Then the notification goes away
      And I log out
      And I log back in
    Then the notification does not appear

  Scenario: Upgrade kolibri through notification link
    When I click on the upgrade link
    Then I download latest kolibri installer
    Then I install latest kolibri
    When I log in
    Then the previous upgrade notification does not appear
