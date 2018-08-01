Feature: Learner take the exam
  learner to be able to take the exam

  Background:
    Given I am signed in to Kolibri as a Learner user
      And I have active and not started exam
      And I am on the *learn > classes > exam* page

  Scenario: Learner take the exam
    When I fill out all questions with answers
    Then That my answers are valid
    When I click *Submit exam* button
    Then The submit modal show up
    When I click *Submit exam* button
    Then I see exam completed