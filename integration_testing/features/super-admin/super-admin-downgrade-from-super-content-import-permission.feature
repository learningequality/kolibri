Feature: Super admin changes device permissions from super admin to device permissions

Background:
  Given I am signed in to Kolibri as a Super admin
    And I am on the *Device > Permissions* page
    And there is super admin user <username> on the device

  Scenario: Super admin can see what will happen if they change another Super admin's permissions to content import permission
    When I click on *Edit permissions* button for <username> user
      And I uncheck the *Make super admin* checkbox
    Then I see that all checkboxes are unchecked and active
      And I see that the *Save changes* button is active
    When I check the *Can import and export content channels* checkbox under *Device permissions*
      And I see that *Save changes* is still active
    When I click *Save changes*
    Then I remain on this page
      And I see a confirmation snackbar *Changes saved*
      And I see *User type* for <full_name> has returned to their previous facility role
      And I see *Save changes* button in disabled

Examples:
| full_name | username |
| Pinco P.  | coach    |
| Neela R.  | ccoach   |
| John C.   | learner  |
| Carrie W. | admin2   |