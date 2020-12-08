Feature: Admin edit users
  Admin needs to be able to edit user's full name and username, reset the passwords, change the user types, and delete them from the facility

  Background:
    Given The user is signed in to Kolibri as a facility admin user
      And The user is on *Facility > Users* page

  Scenario: Admins cannot edit the user account details of a super admin
    When The user finds a super admin in the users list
    Then The user sees that the *Options* dropdown button is disabled for them

  Scenario: Edit user's full name
    When The user clicks on *Options* button for the user he/she wants to edit
      And The user selects *Edit details* option
    Then The user sees *Edit user details* page
    When The user clicks or tab into *Full name* field
      And The user edits the full name as needed
      And The user clicks the *Save* button
    Then The user sees the confirmation message *Changes saved*
    When The user clicks the back arrow button in the upper left corner
      Or The user clicks the *Close* button
    Then The user sees the *Facility > Users* page
      And The user sees the user with edited full name

  Scenario: Edit user's username
    When The user clicks on *Options* button for the user he/she wants to edit
      And The user selects *Edit details* option
    Then The user sees *Edit user details* page
    When The user clicks or tab into *Username* field
      And The user edits the username as needed
      And The user clicks the *Save* button
    Then The user sees the confirmation message *Changes saved*
    When The user clicks the back arrow button in the upper left corner
      Or The user clicks the *Close* button
    Then The user sees the *Facility > Users* page
      And The user sees the user with edited username

    Scenario: Edit user's identifier
    When The user clicks on *Options* button for the user he/she wants to edit
      And The user selects *Edit details* option
    Then The user sees *Edit user details* page
    When The user clicks or tab into *Identifier* field
      And The user edits the identifier as needed
      And The user clicks the *Save* button
    Then The user sees the confirmation message *Changes saved*
    When The user clicks the back arrow button in the upper left corner
      Or The user clicks the *Close* button
    Then The user sees the *Facility > Users* page
      And The user sees the Kolibri user with edited identifier

  Scenario: Edit user's birth year
    When The user clicks on *Options* button for the Kolibri user he/she wants to edit
      And The user selects *Edit details* option
    Then The user sees *Edit user details* page
    When The user clicks or tab into *Birth year* field
      And The user selects the desired year
      And The user clicks the *Save* button
    Then The user sees the confirmation message *Changes saved*
    When The user clicks the back arrow button in the upper left corner
      Or The user clicks the *Close* button
    Then The user sees the *Facility > Users* page
      And The user sees the Kolibri user with edited birth year

  Scenario: Edit user's gender
    When The user clicks on *Options* button for the Kolibri user he/she wants to edit
      And The user selects *Edit details* option
    Then The user sees *Edit user details* page
    When The user clicks or tab into *Gender* field
      And The user selects the desired gender option
      And The user clicks the *Save* button
    Then The user sees the confirmation message *Changes saved*
    When The user clicks the back arrow button in the upper left corner
      Or The user clicks the *Close* button
    Then The user sees the *Facility > Users* page
      And The user sees the Kolibri user with edited gender option

  Scenario: Change user type
    When The user clicks on *Options* button for the Kolibri user he/she wants to edit
      And The user selects *Edit details* option
    Then The user sees *Edit user details* page
    When The user clicks or tab into *User type*
    Then The dropdown opens
    When The user selects the new role
      And The user clicks the *Save* button
    Then The user sees the confirmation message *Changes saved*
    When The user clicks the back arrow button in the upper left corner
      Or The user clicks the *Close* button
    Then The user sees the *Facility > Users* page
      And The user sees the Kolibri user with edited type (label or no label depending on the change)

  Scenario: Change class coach user to facility coach user
    Given There is class coach <username> in the facility
    When The user clicks on *Options* button for the Kolibri user <username>
      And The user selects *Edit details* option
    Then The user sees *Edit user details* page
      And The user sees the *Class coach* radio button active under the *User type*
    When The user clicks and makes the *Facility coach* radio button active
      And The user clicks the *Save* button
    Then The user sees the confirmation message *Changes saved*
    When The user clicks the back arrow button in the upper left corner
      Or The user clicks the *Close* button
    Then The user sees the *Facility > Users* page
      And The user sees the Kolibri user <username> with the *Facility coach* label

  Scenario: Reset user's password
    When The user clicks on *Options* button of the Kolibri user he/she wants to reset password for
      And The user selects *Reset password* option
    Then The user sees *Reset user password* modal
    When The user clicks or tab into *New password* field
      And The user enters the new password
      And The user clicks or tab into *Confirm new password* field
      And The user re-enters the new password
      And The user clicks the *Save* button
    Then The modal closes
      And The user sees the confirmation message *Password for '<username>' changed*

  Scenario: Admin can see the label *Admin* next to their full name, not their facility role
      When The user scrolls to his/her name in the user list
      Then The user sees a label *Admin* next to his/her full name

  Scenario: Admin can’t delete themselves
    When The user scrolls to his/her name in the user list
      And The user clicks on the *Options* dropdown button
    Then The user sees that the *Delete* action is disabled

Examples:
| full_name | username | password |
| Neela R.  | ccoach   | ccoach   |
