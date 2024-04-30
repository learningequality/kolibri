Feature: Admin edit users
  Admin needs to be able to edit user's full name and username, reset the passwords, change the user types, and delete them from the facility

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am at *Facility > Users* page

  Scenario: Admin can edit the user's full name
    When I click on the *Options* button for the user I want to edit
      And I select the *Edit details* option
    Then I see the *Edit user details* page
    When I click or tab into the *Full name* field
      And I edit the full name as needed
      And I click the *Save* button
    Then I am back at the *Facility > Users* page
      And I see the *Changes saved* snackbar message
      And I see the user with edited full name

  Scenario: Admin can edit the user's username
    When I click on the *Options* button for the user I want to edit
      And I select the *Edit details* option
    Then I see the *Edit user details* page
    When I click or tab into *Username* field
      And I edit the username as needed
      And I click the *Save* button
    Then I am back at the *Facility > Users* page
      And I see the *Changes saved* snackbar message
      And I see the user with edited username

  Scenario: Admin can edit the user's identifier
    When I click on the *Options* button for the user I want to edit
      And I select the *Edit details* option
    Then I see the *Edit user details* page
    When I click or tab into *Identifier* field
      And I edit the identifier as needed
      And I click the *Save* button
    Then I am back at the *Facility > Users* page
      And I see the *Changes saved* snackbar message
      And I see the user with edited identifier

  Scenario: Admin can edit the user's birth year
    When I click on the *Options* button for the user I want to edit
      And I select the *Edit details* option
    Then I see the *Edit user details* page
    When I click or tab into *Birth year* field
      And I select the desired year
      And I click the *Save* button
    Then I am back at the *Facility > Users* page
      And I see the *Changes saved* snackbar message
      And I see the user with edited birth year

  Scenario: Admin can edit the user's gender
    When I click on the *Options* button for the user I want to edit
      And I select the *Edit details* option
    Then I see the *Edit user details* page
    When I click or tab into *Gender* field
      And I select the desired gender option
      And I click the *Save* button
    Then I am back at the *Facility > Users* page
      And I see the *Changes saved* snackbar message
      And I see the user with edited gender option

  Scenario: Admin can change user type
    When I click on the *Options* button for the user I want to edit
      And I select the *Edit details* option
    Then I see the *Edit user details* page
    When I click or tab into *User type*
    Then the dropdown opens
    When I select the new role
      And I click the *Save* button
    Then I am back at the *Facility > Users* page
      And I see the *Changes saved* snackbar message
      And I see the user with edited type (label or no label depending on the change)

  Scenario: Admin can change a class coach user to facility coach user
    Given there is class coach in the facility
    When I click on the *Options* button for the user
      And I select the *Edit details* option
    Then I see the *Edit user details* page
      And I see the *Class coach* radio button active under the *User type*
    When I click and make the *Facility coach* radio button active
      And I click the *Save* button
    Then I am back at the *Facility > Users* page
      And I see the *Changes saved* snackbar message
      And I see the user with the *Facility coach* label

  Scenario: Admin can reset the user's password
    When I click on the *Options* button for the user whose password I want to reset
      And I select the *Reset password* option
    Then I see the *Reset user password* modal
    When I click or tab into *New password* field
      And I enter the new password
      And I click or tab into the *Re-enter password* field
      And I re-enter the new password
      And I click the *Save* button
    Then the modal closes
      And I see the snackbar message *Password reset*

  Scenario: Admin cannot edit the user account details of a super admin
    When I find a super admin in the users list
    Then I see that the *Options* dropdown button is disabled for them

  Scenario: Admin can see the label *Admin* next to their full name, not their facility role
    When I scroll to my name in the user list
    Then I see a label *Admin* next to my full name

  Scenario: Admin can’t delete themselves
    When I scroll to my name in the user list
      And I click on the *Options* dropdown button
    Then I see that the *Delete* action is disabled
