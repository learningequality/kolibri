Feature: Learner engages completed quiz
  Learner can access completed quiz

  Background:
    Given I am signed in to Kolibri as a learner user
      And I am on *Learn > Classes* page
      And I have previously completed a quiz

  Scenario: Review a completed quiz
    When I click to open a completed quiz
    Then I see my overall score
    When I select one of incorrectly answered questions
    Then I see *Show correct answer* check box
    When I check the *Show correct answer* check box
    Then I see the correct answer below
