Feature: Learner change profile information
	Learner needs to be able to change their own profile information

  Background:
    Given I am signed in to Kolibri as a learner user
      And I am on the *User > Profile* page
      And I have permission to edit my full name and username

  Scenario: Learner changes username and full name
  	When I change my full name
  	  And I change my username
  	  And if my changes are valid (I did not leave the fields empty)
  	  And I click the “Save changes” button
    Then I see the *Profile details updated* inline notification
      And I see the new full name and username on the profile page
      And I see the new username in the user menu

  Scenario: Learner changes password
    When I click the “Change password” link
    Then I see the “Change password” modal
    When I enter the new password
      And I re-enter the new password
      And if my changes are valid (I did not leave the fields empty, or entered two different passwords)
      And I click the “Update” button
    Then I see the *Password updated* snackbar notification