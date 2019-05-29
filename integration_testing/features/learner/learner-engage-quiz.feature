Feature: Learner engages with an assigned quiz
  Learner can access the quiz that has been assigned by coach, pause/resume it, and review the score/answers once completed

  Background:
    Given I am signed in as a learner user
      And I am on *Learn > Classes > '<class>'* page
      And there is an quiz assigned to me

  Scenario: Take an assigned quiz
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
    
  Scenario: Review a completed quiz
    Given I have previously completed the quiz
      When I click to open a completed quiz
      Then I see my overall score
      When I select one of incorrectly answered questions
      Then I see *Show correct answer* check box
      When I check the *Show correct answer* check box
      Then I see the correct answer below
