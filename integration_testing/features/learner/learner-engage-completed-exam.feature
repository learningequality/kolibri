Feature: Learner engage completed exam
  Learner can access completed exam

  Background:
    Given I am signed in to Kolibri as a Learner user
      And I am on *Learn > Classes* page
      And I have previously completed an exam

  Scenario: Review a completed exam
    When I click one completed exam
    Then I see all my overall score
    When I select one of incorrectly answered questions
    Then I see *Show correct answer* check box
    When I check the *Show correct answer* check box
    Then I see the correct answer below