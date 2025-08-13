Feature: Signed-in user enrolled in classes

  Background:
  Given I'm a signed-in user who is enrolled in classes

  Scenario: Navigation to the home page when there are no channels
    Given there are no imported channels to the device
    When I am at the *Home* page
    Then I see a *No resources available* message
      And I see *Ask your coach or administrator for assistance*

  Scenario: *Your classes* section
    Given there are imported channels on the device
    When I am at the *Home* page
    Then I see the *Your classes section*
      And I can see the list of my classes
      And I can click on a class to go to the *Classes* tab

  Scenario: *Continue learning from your classes* section when there are no class resources or quizzes in progress
    Given there are no class resources or quizzes in progress
    When I am at the *Home* page
    Then the *Continue learning from your classes* section is not displayed

  Scenario: *Continue learning from your classes* section when there are class resources or quizzes in progress
    Given there are no class resources or quizzes in progress
    When I am at the *Home* page
    Then the *Continue learning from your classes* section is displayed
      And I can see all resources and quizzes in progress that belong to my classes
      And if I click a resource/quiz card I can go to the class resource/quiz page
      And there are no resources that are in progress but don't belong to any of my classes

  Scenario: *Recent lessons* section when the learner is enrolled in some classes but there are no active lessons in any of their classes
    Given I am enrolled in some classes but there are no active lessons in any of my classes
    When I am at the *Home* page
    Then the *Recent lessons* section is not displayed

  Scenario: *Recent lessons* section when the learner is enrolled in some classes in which there are active lessons
    Given I am enrolled in some classes in which there are active lessons
    When I am at the *Home* page
    Then the *Recent lessons* section is displayed
      And I can see the active lessons from my classes
      And if I click on a lesson card I can go to the lesson page within the *Classes* tab

  Scenario: *Recent quizzes* section when the learner is enrolled in some classes but there are no active quizzes in any of their classes
    Given I am enrolled in some classes but there are no active quizzes in any of my classes
    When I am at the *Home* page
    Then the *Recent quizzes* section is not displayed

  Scenario: *Recent quizzes* section when the learner is enrolled in some classes for which there are some active quizzes
    Given I am enrolled in some classes for which there are some active quizzes
    When I am at the *Home* page
    Then the *Recent quizzes* section is displayed
      And I can see the active quizzes from my classes
      And if I click on a quiz which has not started yet or is in progress I can go to the quiz page
      And if I click on a quiz which has been completed I can go to the quiz report page

  Scenario: *Continue learning on your own* section when the learner hasn't completed all their class resources and quizzes yet
    Given I haven't completed all my class resources and quizzes yet
    When I am at the *Home* page
    Then the *Continue learning on your own* section is not displayed

  Scenario: *Continue learning on your own* section is not displayed when a learner has some non-classes resources in progress and has finished all their classes resources and quizzes
    Given I have some non-classes resources in progress and have finished all my classes resources and quizzes
      And access to unassigned content is not allowed (*Signed in learners should only see resources assigned to them in classes* option in device settings)
    When I am at the *Home* page
    Then the *Continue learning on your own* section is not displayed

  Scenario: *Continue learning on your own* section is displayed when the learner has some non-classes resources in progress and has finished all their classes resources and quizzes
    Given I have some non-classes resources in progress and have finished all my classes resources and quizzes
      And access to unassigned content is allowed
    When I am at the *Home* page
    Then the *Continue learning on your own* section is displayed
      And the above mentioned resources are displayed
      And if I click a resource I can go to the topic resource page

  Scenario: *Explore channels* section is not displayed when the learner has completed all their class resources and quizzes
    Given I have completed all my class resources and quizzes
      And access to unassigned content is not allowed (*Signed in learners should only see resources assigned to them in classes* option in device settings)
    When I am at the *Home* page
    Then the *Explore channels* section is not displayed

  Scenario: *Explore channels* section is displayed when the learner has completed all their class resources and quizzes
    Given I have completed all my class resources and quizzes
      And access to unassigned content is allowed
    When I am at the *Home* page
    Then the *Explore channels* section is displayed
      And I can see the channels available on the device
      And if I click on a channel I can go to the channel page
      And if there are more than three channels I can see only the first three channels and a *View all* link to the *Library* page
