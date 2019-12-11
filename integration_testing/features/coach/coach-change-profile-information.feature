Feature: Coach changes profile information
  Coach needs to be able to change their own profile information

  Background:
    Given I am signed in to Kolibri as a coach user
      And I am on my <username> *Profile > Details* page
      And facility is set up to allow learners and coaches to edit full names, usernames, and change their passwords

  Scenario: Coach changes username and full name
    When I click the *Edit* button
    Then I see the *Edit profile* page
    When I change my full name
      And I change my username
      And if my changes are valid (I did not leave the fields empty)
      And I click the “Save” button
    Then I see the *Profile details updated* snackbar notification
    When I go back to my *Profile > Details* page
    Then I see the new full name and username on the profile page
      And I see the new username in the user menu

    Scenario: Coach selects gender and birth year
    When I click the *Edit* button
    Then I see the *Edit profile* page
    When I select my gender
      And I select my birth year
      And I click the “Save” button
    Then I see the *Profile details updated* snackbar notification
    When I go back to my *Profile > Details* page
    Then I see my selected gender and birth year on the profile page

  Scenario: Coach changes password
    When I click the “Change password” link
    Then I see the “Change password” modal
    When I enter the new password
      And I re-enter the new password
      And if my changes are valid (I did not leave the fields empty, or entered two different passwords)
      And I click the “Update” button
    Then I see the *Your password has been changed* snackbar notification
