Feature: Learner take exam
  Learner can access the exam that has been assigned by coach

  Background:
    Given I am signed in as a learner user
      And I am on *Learn > Classes* page
      And there is an exam assigned to me

  Scenario: Take an asigned exam
    When I click to select a not started exam
    Then I see all exam questions
    When I fill out all questions with answers
    When I click *Submit exam* button
    Then I see the *Submit exam* modal
    When I click *Submit exam* button
    Then I see the exam is marked as *Completed*