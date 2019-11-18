Feature: Super admin grants and revokes the content import permissions
    Super admin needs to be able to grant and revoke the device permissions to other users to import content channels on the device

  Background:
    Given I am signed in to Kolibri as super admin
      And I am on *Device > Permissions* page

  Scenario: Grant import content device permissions
    When I click on *Edit permissions* button for <username> user
    Then I see <full_name> user permissions page
    When I check the *Can manage resources on this device* checkbox
    Then I see the *Save changes* button is active
    When I click *Save changes* button
    Then I see the *Changes saved* notification
      And the *Save changes* button is now inactive
    When I click on *Cancel* button after saving
    Then I see the *Device permissions* page again
      And I see the black key icon in front of the <username> user

  Scenario: Revoke import content device permissions
    Given that <username> user has import content device permissions
    When I click on *Edit permissions* button for <username> user
    Then I see <username> permissions page
    When I uncheck the *Can manage resources on this device* checkbox
    Then I see the *Save changes* button is active
    When I click *Save changes* button
    Then I see the *Changes saved* notification
      And the *Save changes* button is now inactive
    When I click on *Cancel* button after saving
    Then I see the *Device permissions* page again
      And I don't see the black key icon in front of the <username> user

Examples:
| full_name | username |
| Pinco P.  | coach    |
| Neela R.  | ccoach   |
| John C.   | learner  |
| Carrie W. | admin2   |
