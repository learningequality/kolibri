Feature: Admin deletes users
  Admin needs to be able to delete users from the facility

  Background:
    Given The user is signed in to Kolibri as a facility admin user
      And The user is on *Facility > Users* page

  Scenario: Delete user
    When The user clicks on *Options* button for the user he/she wants to edit
      And The user selects *Delete* option
    Then The user sees *Delete user * modal
    When The user clicks the *Delete* button
    Then The modal closes
      And The user sees the *Facility > Users* page again
      And The user sees the snackbar confirmation that the user has been deleted
    When The user searches for the deleted user in the search field
    Then The user sees the *No users match the filter* result

  Scenario: Try (and fail) to delete your own account
    When The user clicks on *Options* button for his/hers own account
    Then The user sees that the *Delete* option is not active
