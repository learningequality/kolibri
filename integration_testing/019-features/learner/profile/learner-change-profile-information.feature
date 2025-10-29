Feature: Learner changes profile information
	Learner needs to be able to change their own profile information

  Background:
    Given I am signed in to Kolibri as a learner user
      And I am on my *Profile* page
      And facility is set up to allow learners and coaches to edit full names and usernames

  Scenario: Learner changes username and full name
  	When I click the *Edit* button
    Then I see the *Edit profile* page
    When I change my full name
  	  And I change my username
  	  And I click the *Save* button
    Then I am back at my *Profile* page
    	And I see the *Changes saved* snackbar notification
      And I see the new full name and username
      And I see the new username in the user menu

  Scenario: Learner changes gender and birth year
    When I click the *Edit* button
    Then I see the *Edit profile* page
    When I select a value from the *Gender* drop-down
      And I select a birth year from the *Birth year* drop-down
      And I click the *Save* button
    Then I am back at my *Profile* page
      And I see the *Changes saved* snackbar notification
      And I see my selected gender and birth year at the profile page

  Scenario: Learner changes password
    When I click the *Change password* link
    Then I see the *Change password* modal
    When I enter a new password
      And I re-enter the new password
      And I click the *Update* button
    Then I am back at my *Profile* page
    	And I see the *Your password has been changed* snackbar notification
