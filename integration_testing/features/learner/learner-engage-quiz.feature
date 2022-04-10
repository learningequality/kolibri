Feature: Learner engages with an assigned quiz
  Learner can access the quiz that has been assigned by coach, pause/resume it, and review the score/answers once completed

  Background:
    Given I am signed in as a learner user
      And I am at *Learn > Home > Classes > '<class>'* page
      And there is a quiz assigned to me

  Scenario: Start taking an assigned quiz and pause it
    When I select the assigned <quiz> quiz
    Then I see all the available quiz questions
    When I fill out some questions with answers
    	And I click the *x* button to close the quiz
    Then I am back at the *Learn > Home > Classes > '<class>'* page
	    And I see the <quiz> quiz's card with an *In progress* icon and the number of remaining questions left

  Scenario: Resume and complete a paused quiz
    When I click to select the previously started <quiz> quiz with an *In progress* icon
    Then I see all the available quiz questions
    When I answer the remaining questions
    	And I click the *Submit quiz* button
    Then I see the *Submit quiz* modal
    When I click the *Submit quiz* button
    Then I am back at the *Learn > Home > Classes > '<class>'* page
    	And I see a yellow star icon at the lower left corner of the <quiz> quiz card
    	And I see the score of the quiz in percents

  Scenario: Review a completed quiz
    Given I have completed an assigned quiz
    When I click to open a completed quiz
    Then I see the *Report for <quiz>* page
    	And I see the full name of the user
    	And I see a yellow star icon, *Completed* label and when it was completed
    	And I see the quiz title, overall score in percents and the number of questions answered correctly
    	And I see the *Answer history* section
    	And I see the correct answers marked with a green checkmark and the incorrect answers marked with a red x icon
    When I select a correctly answered question from the *Answer history*
    Then I can see the answer to that question
    When I select one of the incorrectly answered questions
    Then I see a *Show correct answer* check box
    When I check the *Show correct answer* check box
    Then I see the correct answer below

Examples:
  | class      | quiz     |
  | Test Class | Test Quiz|
