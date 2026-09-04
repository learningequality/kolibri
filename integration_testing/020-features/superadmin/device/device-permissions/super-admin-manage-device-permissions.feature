Feature: Super admin grants and revokes the super admin and manage resources permissions
    Super admin needs to be able to grant and revoke super admin permissions and the device permissions to manage resources on the device to other facility users

  Background:
    Given I am signed in to Kolibri as a super admin
      And I am at the *Device > Permissions* page
      And there is a facility user without super admin permissions

    Scenario: Grant super admin permissions to a user
      When I click *Edit permissions* for a user
      Then I see the permissions page for the user
      When I check the *Make super admin* checkbox
      Then I see that the *Can manage resources on this device* checkbox under *Device permissions* is checked and disabled
        And the *Save changes* button becomes active
      When I click the *Save changes* button
      Then I see the *Changes saved* snackbar message
      	And I'm redirected to the *Device Permissions* page
      	And I see a yellow key icon in front of the full name of the user indicating that the user is a super admin
      When I click on *Edit permissions* for the user
      Then I see that the *User type* value is now *Super admin*
        And I see that the *Make Super admin* checkbox is checked but not disabled
        And I see that the *Save changes* button is disabled

    Scenario: Downgrade permissions from super admin to *Can manage resources on this device*
      Given I am at the *Permissions* page for a super admin user
      When I uncheck the *Make super admin* checkbox
      Then I see that all checkboxes are unchecked and active
        And I see that the *Save changes* button is active
      When I check the *Can manage resources on this device* checkbox under *Device permissions*
        And I click the *Save changes* button
      Then I see the *Changes saved* snackbar message
      	And I'm redirected to the *Device Permissions* page
        And I see a black key icon in front of the full name of the user indicating that the user has limited permissions to manage resources on the device
      When I click on *Edit permissions* for the user
      Then I see that the *User type* value is no longer *Super admin*
        And I see that only the *Can manage resources on this device* checkbox is checked
        And I see that the *Save changes* button is disabled

    Scenario: Fully revoke super admin permissions
      Given I am at the *Permissions* page for a super admin user
      When I uncheck the *Make super admin* checkbox
      Then I see that all checkboxes are unchecked and active
        And I see that the *Save changes* button is active
      When I click the *Save changes* button
      Then I see the *Changes saved* snackbar message
      	And I'm redirected to the *Device Permissions* page
      When I click on *Edit permissions* for the user
      Then I see that the *User type* has changed to the user's previous role in the facility
        And I see that both checkboxes are unchecked
        And I see that the *Save changes* button is disabled

    Scenario: Grant *Can manage resources on this device* device permissions to a user
      When I click on the *Edit permissions* button for a user
      Then I see user's permissions page
      When I check the *Can manage resources on this device* checkbox
      Then I see the *Save changes* button is active
      When I click the *Save changes* button
      Then I see the *Changes saved* snackbar message
      	And I'm redirected to the *Device Permissions* page
        And I see a black key icon in front of the full name of the user indicating that the user has limited permissions to manage resources on the device
      When I click on *Edit permissions* for the user
      Then I see that the *User type* value is still the same as before
        And I see that only the *Can manage resources on this device* checkbox is checked
        And I see that the *Save changes* button is disabled

    Scenario: Revoke the *Can manage resources on this device* device permissions
      Given I am at the *Permissions* page for a user with *Can manage resources on this device* device permissions
      When I uncheck the *Can manage resources on this device* checkbox
	      And I click the *Save changes* button
      Then I see the *Changes saved* snackbar message
      	And I'm redirected to the *Device Permissions* page
      When I click on *Edit permissions* for the user
      Then I see that the *User type* is unchanged
        And I see that both checkboxes are unchecked
        And I see that the *Save changes* button is disabled
