Feature: Classes page default behaviors

  Background:
    Given I am enrolled in at least one class
    	And I have assigned lessons, quizzes and courses
    When I go to *Home > Classes > <class>*
    Then I see my assigned courses under the header *Your courses*
    	And I see my assigned lessons under the header *Your lessons*
      And I see my assigned quizzes under the header *Your quizzes*

  Scenario: Learner opens a lesson and interacts with a resource
    When I click on the lesson card
    Then I see the lesson resources displayed as single-column cards
    When I click on a resource
    Then I see the resource's viewer page
      And I can interact with the resource

	Scenario: Learner opens a a quiz
      When I click on the quiz card
      Then I am at the quiz page
        And I can see and interact with the available questions
