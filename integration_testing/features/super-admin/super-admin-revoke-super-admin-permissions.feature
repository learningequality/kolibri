Feature: Super admin removes all device permissions from another super admin

  Background:
    Given I am signed in to Kolibri as a super admin
      And I am on the *Device > Permissions* page
      And there is a <username> super admin user on the device

  Scenario: Super admin can revoke super admin permissions to another user
    When I click on *Edit permissions* button for <username> user
      And I uncheck the *Make super admin* checkbox
    Then I see checkbox under *Device permissions* is also unchecked and active
      And I see the *Save changes* button is active
    When I click *Save changes*
    Then I see the confirmation snackbar *Changes saved*
      And I see *User type* has changed to the previous role they had in the facility
      And I see all checkboxes are unchecked
      And I see *Save changes* button is disabled

Examples:
| full_name | username |
| Pinco P.  | coach    |
| Neela R.  | ccoach   |
| John C.   | learner  |
| Carrie W. | admin2   |