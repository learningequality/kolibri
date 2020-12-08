Feature: Admin changes profile information
  Admin needs to be able to change their own profile information

  Background:
    Given The user is signed in to Kolibri as a facility admin
      And The user is on the *User > Profile* page

  Scenario: Admin changes username and full name
    When The user clicks the *Edit* button
    Then The user sees the *Edit profile* page
    When The user changes his/hers full name
      And The user changes is/hers username
      And If user's changes are valid (User does not leave the fields empty)
      And The user clicks the “Save” button
    Then The user sees the *Changes saved* snackbar notification
    When The user goes back to the *Profile > Details* page
    Then The user sees the new full name and username on the profile page

  Scenario: Admin selects gender and birth year
    When The user clicks the *Edit* button
    Then The user sees the *Edit profile* page
    When The user selects a gender
      And The user selects a birth year
      And The user clicks the “Save” button
    Then The user sees the *Changes saved* snackbar notification
      And The user sees his/hers selected gender and birth year on the profile page

  Scenario: Admin changes password
     When The user clicks the “Change password” link
     Then The user sees the “Change password” modal
     When The user enters the new password
      And The user re-enters the new password
      And If user's changes are valid (user did not leave the fields empty, or entered two different passwords)
      And The user clicks the “Update” button
    Then The user sees the *Password changed* snackbar notification
