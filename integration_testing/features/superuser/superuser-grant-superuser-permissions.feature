Feature: Superuser create users
    Superuser needs to be able to grant superuser permissions to other users so they can manage permissions and import content channels on the device

  Background:
    Given I am signed in to Kolibri as superuser
      And I am on *Device > Permissions* page

  Scenario: Grant superuser permissions
    When I click on *Edit permissions* button for <username> user
    Then I see <username> permissions page
    When I check the *Make superuser* checkbox
    Then I see the *Can import and export content channels* checkbox is inactive
      And I see the *See changes* button is active
    When I click *Save changes* button
    Then I see the *Device permissions* page again
      And I see the yellow key icon in front of the <username> user

  Scenario: Revoke superuser permissions
    Given that <username> user has superuser permissions
    When I click on *Edit permissions* button for <username> user
    Then I see <username> permissions page
    When I uncheck the *Make superuser* checkbox
    Then I see the *Can import and export content channels* checkbox is active
      And I see the *See changes* button is active
    When I click *Save changes* button
    Then I see the *Device permissions* page again
      And I don't see the yellow key icon in front of the <username> user

Examples:
| full_name | username |
| Pinco P.  | coach    |
| Neela R.  | ccoach   |
| John C.   | learner  |
| Carrie W. | admin2   |