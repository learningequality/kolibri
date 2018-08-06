Feature: Learner take exam
  Learner can access the exam that has been assigned by coach

  Background:
    Given I am signed in to Kolibri as a Learner user
      And The facility coach create and activate an exam for our class
      And I am on *learn > classes* page

  Scenario: Learner take an exam after it has been assigned
    When I select a not started exam
    Then I see all exam questions
    When I fill out all questions with answers
    When I click *Submit exam* button
    Then The submit exam modal show up
    When I click *Submit exam* button
    Then I see exam completed