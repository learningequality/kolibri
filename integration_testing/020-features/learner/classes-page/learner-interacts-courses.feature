Feature: Learner engages with an assigned course
  Learner can access and interact with a course assigned by a coach

  Background:
    Given I am signed in as a learner user
      And I am at *Learn > Home > Classes > '<class>'* page
      And there is a course assigned to me

  Scenario: Learner interacts with and closes a course without submitting it
    When I click on a course card
    Then I see the course modal
      And I see the course title, logo and description
      And I see a *Start course* button
      And I see the *Course content* section
    When I interact with some of the course content
      And I close the course modal
    Then I am back at the *Learn > Home > Classes > '<class>'* page
      And I see a blue clock icon at the lower right corner of the course card
      And I see a progress bar with the progress made

  Scenario: Learner interacts with and completes a course
  	Given I am signed in as a learner user
  	  And I am at *Learn > Home > Classes > '<class>'* page
  	  And there is an assigned course with which I've previously interacted
    When I click on the course card
    Then I see the course modal
      And I see each section of the course
      And I see all of the progress made so far clearly indicated
    When I complete all of the available course materials
      And I click the *Submit course* button
    Then I see the *Submit course* modal
    When I click the *Submit course* button
    Then I am back at the *Learn > Home > Classes > '<class>'* page
      And I see a yellow star icon at the lower right corner of the course card
      And I see the number of units and completed lessons

  Scenario: Learner reviews a completed course
    Given I have completed an assigned course
      And I am at *Learn > Home > Classes > '<class>'* page
    When I click on the card to open a completed course
    Then I see the course report page
      And I see the course title and description
      And I see the overall course completion status
      And I see the completed units and lessons
      And I see my performance or score for completed materials
      And I can open previously completed materials for review
