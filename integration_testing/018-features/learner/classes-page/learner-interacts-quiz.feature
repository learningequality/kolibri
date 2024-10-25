Feature: Learner engages with an assigned quiz
  Learner can access the quiz that has been assigned by coach, pause/resume it, and review the score/answers once completed

  Background:
    Given I am signed in as a learner user
      And I am at *Learn > Home > Classes > '<class>'* page
      And there is a quiz assigned to me

  Scenario: Learner interacts with and closes a quiz without submitting it
    When I click on a quiz card
    Then I see the quiz modal
    When I answer some of the questions
      And I close the quiz modal
    Then I am back at the *Learn > Home > Classes > '<class>'* page
      And I see a blue clock icon at the lower left corner of the quiz card
      And I see the number of questions left
    When I click on the quiz card
    Then I see the quiz modal
      And I see all of my previously given answers
    When I answer the remaining questions
      And I clock the *Submit quiz* button
    Then I am back at the *Learn > Home > Classes > '<class>'* page
      And I see a yellow star icon at the lower left corner of the quiz card
      And I see the score of the quiz in percents

  Scenario: Learner interacts with and completes a quiz with sections
  	Given I am signed in to Kolibri as a learner
  	  And I am at *Learn > Home > Classes > <class>*
  	  And there is an assigned quiz with sections
    When I click on the quiz card
    Then I see the quiz modal
      And I see each section of the quiz in a panel to the left of the quiz
      And I see all of the available questions for each section
      And I see that the first question is selected by default
      And I see the first question and its answers displayed in the *Question 1 of N* panel to the right
    When I click on a section heading
    Then I can see it expanding
    When I click on a question
      And I select or type an answer for the question
      And I click the *Next* button
    Then I see the next question
    When I select or input an answer for all of the available questions
      And I click the *Submit quiz* button
    Then I see the *Submit quiz* modal
    When I click the *Submit quiz* button
    Then I am back at the *Learn > Home > Classes > '<class>'* page
      And I see a yellow star icon at the lower left corner of the quiz card
      And I see the score of the quiz in percents

  Scenario: Learner reviews a completed quiz
    Given I have completed an assigned quiz
    When I click on the card to open a completed quiz
    Then I see the quiz report page
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
