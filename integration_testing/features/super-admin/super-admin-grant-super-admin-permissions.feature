Feature: Super admin gives Super admin permissions to a facility user
  Super admin should understand the implications of what it means to make a facility user a Super admin

  Background:
    Given I am signed in to Kolibri as a Super admin
      And I am on the *Device > Permissions* page
      And there is a <username> facility user who does not have device permissions
      
  Scenario: Super admin can see what happens when they grant Super admin permissions to another user
    When I click *Edit Permissions* for the <username> user 
    Then I see the <full_name> user permissions page
    When I click on the *Make super admin* checkbox
    Then I see that the checkbox under *Device permissions* is checked and disabled
      And the *Save changes* button becomes active
    When I click *Save changes*
    Then I see the confirmation snackbar *Changes saved*
      And I see *User type* is now *Super admin*
      And I see the *Make Super admin* checkbox is checked but not disabled
      And I see *Save changes* button is disabled

Examples:
| full_name | username |
| Pinco P.  | coach    |
| Neela R.  | ccoach   |
| John C.   | learner  |
| Carrie W. | admin2   |