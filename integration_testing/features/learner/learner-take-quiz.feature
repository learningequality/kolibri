Feature: Learner takes quiz
  Learner can access the quiz that has been assigned by coach

  Background:
    Given I am signed in as a learner user
      And I am on *Learn > Classes* page
      And there is an quiz assigned to me

  Scenario: Take an asigned quiz
    When I click to select a quiz with the label *Not started*
    Then I see all quiz questions
    When I fill out all questions with answers
    When I click *Submit quiz* button
    Then I see the *Submit quiz* modal
    When I click *Submit quiz* button
    Then I see the quiz is marked as *Completed*

  Scenario: Resume a paused quiz
    When I click to select a previously started quiz with the label *Started*
    Then I see all quiz questions
    When I answer the remaining questions
    When I click *Submit quiz* button
    Then I see the *Submit quiz* modal
    When I click *Submit quiz* button
    Then I see the quiz is marked as *Completed*