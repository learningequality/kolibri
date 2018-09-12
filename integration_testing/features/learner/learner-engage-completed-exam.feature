Feature: Learner engage completed exam
  Learner can access completed exam

  Background:
    Given I am signed in to Kolibri as a Learner user
      And I have an completed exam
      And I am on *Learn > Classes* page

  Scenario: Learner can access completed exam
    When I select on one completed exam
    Then I see all my overall score
     And I select one question with wrong answer
    Then I see *show correct answer* check box
     And I check *show correct answer* check box
    Then The correct answer showed