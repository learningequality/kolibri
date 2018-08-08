Feature: Learner change profile information
	learner to be able to change profile information

  Background:
    Given I am signed in to Kolibri as a Learner user
      And I have permission to edit my full name
      And I have permission to edit my username
      And I am on the *User > Profile* page

  Scenario: Learner change profile information
  	 When I change the full name <full_name>
  	  And I change the username <username>
  	 Then That my changes are valid
  	 When I click on the “save changes” button
  	 Then I see profile information is changed

	Examples:
	| full_name | username |
	| learner   | learner  |