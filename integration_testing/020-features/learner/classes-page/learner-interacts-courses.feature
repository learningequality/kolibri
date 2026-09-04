Feature: Learner engages with an assigned course
  Learner can access and interact with a course assigned by a coach

  Background:
    Given I am signed in as a learner user
      And I am at *Learn > Home > Classes > '<class>'* page
      And there is a course assigned to me

  Scenario: Learner can see the summary of an assigned course with no pre-test started
  	When I click on the course card
  	Then I can see the course page
  		And I can see the course title, thumbnail, number of units and lessons and course description
  		And I can see a disabled *Start course* button
  		And I can see the collapsed course units
  	When I click on a unit
  	Then I can see the grayed out contents of the unit including a pre-test, lessons with resources and a post-test
  		And I cannot interact with any of them

  Scenario: Learner can see and complete a course pre-test
  	Given a coach has stated a pre-test
    When I click on the course card
    Then I can see the course page
      And I can see an enabled *Start course* button
    When I click the *Start course* button
    Then I can see the first question of the pre-test
    When I fill in all of the questions
      And I click the *Submit test* button
    Then I see the *Submit test* modal with the following text: *You cannot change your answers after you submit*
    When I click the *Submit test* button
    Then I see the following text: *Pre-test completed! You will be able to continue once your coach closes this pre-test.*
    	And I see that the *Previous* and *Next* buttons are disabled
    	And to the right I can see the pre-test marked as completed
    	And I can see the lesson resources grayed out
    	And I can see a disabled *Up next* section at the bottom right corner of the course
    TO DO
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
