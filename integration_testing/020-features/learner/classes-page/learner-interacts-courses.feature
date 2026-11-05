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
    When I click the back arrow
    Then I can see the course page
      And I can see an enabled *Resume course* button
    When I click the back arrow
    Then I am back at the *Learn > Home* page
      And I can see the course card in the *Recent courses* section

  Scenario: Learner completes course resources
  	Given a learner has completed the first pre-test
  		And a coach has ended the pre-test
  	When I click on the course card
    Then I can see the course page
      And I can see an enabled *Resume course* button
    When I click the *Resume course* button
    Then I can see the contents of the first available resource
    When I complete the resource #or mark the resource as complete
    Then I can see the contents of the next available resource
    When I complete all of the available resources
    Then I see the following text: *Unit completed! You have completed all resources in this unit. You may review resources until the next unit is opened*
    	And I can see a disabled *Up next* section at the bottom right corner of the course
    When I click on any of the previously completed resources
    Then I can see its contents and interact with it
    When I click the back arrow
    Then I can see the course page
      And I can see an enabled *Resume course* button
    When I click the back arrow
    Then I am back at the *Learn > Home* page
      And I can see the course card in the *Recent courses* section

  Scenario: Learner can see and complete a course post-test
  	Given a coach has started a post-test
    When I click on the course card
    Then I can see the course page
      And I can see an enabled *Resume course* button
    When I click the *Resume course* button
    Then I can see the first question of the post-test
    When I fill in all of the questions
      And I click the *Submit test* button
    Then I see the *Submit test* modal with the following text: *You cannot change your answers after you submit*
    When I click the *Submit test* button
    Then I see the following text: *Post-test completed! You will be able to continue once your coach closes this post-test.*
    	And I see that the *Previous* and *Next* buttons are disabled
    	And to the right I can see the post-test marked as completed
    	And I can see the lesson resources grayed out
    	And I can see a disabled *Up next* section at the bottom right corner of the course
    When I click the back arrow
    Then I can see the course page
      And I can see an enabled *Resume course* button
    When I click the back arrow
    Then I am back at the *Learn > Home* page
      And I can see the course card in the *Recent courses* section

  Scenario: Learner interacts with and completes a course
  	Given as a learner I've completed all course units
  		And a coach has started the final post-test
  	When I click on the course card
    Then I can see the course page
      And I can see an enabled *Resume course* button
    When I click the *Resume course* button
    Then I can see the first question of the post-test
    When I fill in all of the questions
      And I click the *Submit test* button
    Then I see the *Submit test* modal with the following text: *You cannot change your answers after you submit*
    When I click the *Submit test* button
    Then I see the following text: *Post-test completed! You will be able to continue once your coach closes this post-test.*
    	And I see that the *Previous* and *Next* buttons are disabled
    	And to the right I can see the post-test marked as completed
    	And I can see the lesson resources grayed out
    	And I can see can no longer see an *Up next* section at the bottom right corner of the course
    When I click the back arrow
    Then I can see the course page
      And I can see an enabled *Resume course* button
    When I click the back arrow
    Then I am back at the *Learn > Home* page
      And I can see the course card in the *Recent courses* section

  Scenario: Learner reviews a completed course
    Given a learner has submitted the final course post-test
  		And the coach has ended the post-test
  	When I click on the course card
    Then I see the course report page
      And I see the course title and description
      And I can see an enabled *Review course* button
      And I see the completed units and lessons
    When I click the *Review course* button
    Then I can see all of the available course resources
    	And I can browse through the available units, lessons and resources
    When I click the back arrow
    Then I can see the course page
      And I can see an enabled *Review course* button
    When I click the back arrow
    Then I am back at the *Learn > Home* page
      And I can see the course card in the *Recent courses* section
