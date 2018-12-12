Feature: Learner take quiz
  Learner can access the quiz that has been assigned by coach

  Background:
    Given I am signed in as a learner user
      And I am on *Learn > Classes* page
      And there is an quiz assigned to me

  Scenario: Take an asigned quiz
    When I click to select a not started quiz
    Then I see all quiz questions
    When I fill out all questions with answers
    When I click *Submit quiz* button
    Then I see the *Submit quiz* modal
    When I click *Submit quiz* button
    Then I see the quiz is marked as *Completed*
