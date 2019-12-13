Feature: Super admin grants and revokes the super-admin and content import permissions
    Super admin needs to be able to grant and revoke super admin permissions and the device permissions to import content channels on the device to other facility users  

  Background:
    Given I am signed in to Kolibri as super admin
      And I am on *Device > Permissions* page
      And there is a <username> facility user who does not have device permissions

    Scenario: Grant super admin permissions to another user
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

    Scenario: Downgrade permissions from super admin to content import
      When I click on *Edit permissions* button for <username> user
        And I uncheck the *Make super admin* checkbox
      Then I see that all checkboxes are unchecked and active
        And I see that the *Save changes* button is active
      When I check the *Can manage resources on this device* checkbox under *Device permissions*
        And I see that *Save changes* is still active
      When I click *Save changes*
      Then I remain on this page
        And I see a confirmation snackbar *Changes saved*
        And I see *User type* for <full_name> has returned to their previous facility role
        And I see *Save changes* button in disabled

    Scenario: Revoke super admin permissions
      When I click on *Edit permissions* button for <username> user
        And I uncheck the *Make super admin* checkbox
      Then I see checkbox under *Device permissions* is also unchecked and active
        And I see the *Save changes* button is active
      When I click *Save changes*
      Then I see the confirmation snackbar *Changes saved*
        And I see *User type* has changed to the previous role they had in the facility
        And I see all checkboxes are unchecked
        And I see *Save changes* button is disabled

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
