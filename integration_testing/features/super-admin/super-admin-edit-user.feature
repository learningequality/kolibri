Feature: Super admin edit users
    Super admin needs to be able to edit user's full name and username, reset the passwords, change the user types, and delete them from the facility

  Background:
    Given I am signed in to Kolibri as a Super admin
      And I am on the *Facility > Users* page

  Scenario: Edit user's full name
    When I click on *Options* button for the user I want to edit
      And I select *Edit details* option
    Then I see *Edit user details* modal
    When I click or tab into *Full name* field
      And I edit the full name as needed
      And I click the *Save* button
    Then the modal closes
      And I see the user with edited full name

  Scenario: Edit user's username
    When I click on *Options* button for the user I want to edit
      And I select *Edit details* option
    Then I see *Edit user details* modal
    When I click or tab into *Username* field
      And I edit the username as needed
      And I click the *Save* button
    Then the modal closes
      And I see the user with edited username

  Scenario: Change user type
    When I click on *Options* button for the user I want to edit
      And I select *Edit details* option
    Then I see *Edit user details* modal
    When I click or tab into *User type*
    Then the dropdown opens
    When I select the new role
      And I click the *Save* button
    Then the modal closes
      And I see the user with edited type (label or no label depending on the change)
# TODO: add options for the 2 coach types

  Scenario: Reset user's password
    When I click on *Options* button of the user I want to reset password for
      And I select *Reset password* option
    Then I see *Reset user password* modal
    When I click or tab into *New password* field
      And I enter the new password
      And I click or tab into *Confirm new password* field
      And I re-enter the new password
      And I click the *Save* button
    Then the modal closes
      And I see the *Facility > Users* page again # no confirmation that the password has been reset

  Feature: Super admin can see that their role is distinguished in the user list in *Facility > Users* and there are different Options options than other users

    Scenario: Super admin can see the label *Super admin* next to their full name, not their facility role
      When I scroll to my name in the user list
      Then I see a label *Super admin* next to my full name

    Scenario: Super admin can’t delete themselves
      When I scroll to my name in the user list
        And I click on the *Options* dropdown button
      Then I see that the *Delete* action is disabled

  Feature: Super admin cannot edit their own user type from the *Edit user* modal, but can find a cross link to the Device permissions page

    Scenario: Super admin can see the read-only label *Super admin* under *User type*, not their facility role
      When I look at the field for *User type*
      Then I see that I am a Super admin
      And a message that directs me to *Device permissions* to view more details

    Scenario: Super admin navigates to *Device permissions* from the *Edit user* modal
      When I click on the link to *Device permissions*
      Then I am redirected to my permissions page in *Device > Permissions*

  Feature: Super admin cannot edit the user type of another Super admin from the *Edit user* modal, but can find a cross link to the Device permissions page to make changes there

    Scenario: Super admin can see the read-only *Super admin* label under *User type*, and a cross-link to *Device permissions* to make changes
    	When I look at the field for *User type*
    	Then I see that I am a Super admin
    	And a message that directs me to *Device permissions* to make changes

    Scenario: Super admin navigates to *Device permissions* from the *Edit user details* modal
      When I click on the link to *Device permissions*
      Then I am redirected to that user’s device permissions page in *Device > Permissions*

