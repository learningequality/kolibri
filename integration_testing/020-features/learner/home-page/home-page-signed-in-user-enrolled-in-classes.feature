Feature: Signed-in user enrolled in classes

  Background:
  Given I'm a signed-in user who is enrolled in classes

  Scenario: Navigation to the home page when there are no channels
    Given there are no imported channels on the device
    When I click the *Home* tab
    Then I am redirected to *Learn > Library*
    	And I see a *No resources available* message
      And I see *Ask your coach or administrator for assistance*
      And I see the *Other libraries* section

  Scenario: Navigation to the home page when there are imported channels
    Given there are imported channels on the device
    When I go to the *Home* page
    Then I see the *Your classes section*
      And I can see the list of my classes
      And I can click on a class to go to *Home > Classes > <class>*

  Scenario: User can see the *Continue learning from your classes* section
    Given there are class resources or quizzes in progress
    When I go to the *Home* page
    Then the *Continue learning from your classes* section is displayed
      And I can see all resources and quizzes in progress that belong to my classes
    When I click on a resource/quiz card
    Then I see the class resource/quiz page

  Scenario: User can see the *Recent lessons* section
    Given I am enrolled in some classes in which there are active lessons
    When I go to the *Home* page
    Then I can see the *Recent lessons* section
    When I click on a lesson card I can go to the lesson page

  Scenario: User can see the *Recent quizzes* section
    Given I am enrolled in some classes for which there are some active quizzes
    When I go to the *Home* page
    Then I can see the *Recent quizzes* section
      And I can see the active quizzes from my classes
      And if I click on a quiz which has not started yet or is in progress I can go to the quiz page
      And if I click on a quiz which has been completed I can go to the quiz report page

  Scenario: User can see the *Continue learning on your own* section
    Given I have interacted with some unassigned resources
    	And the resources are in progress
    	And I have finished all my assigned resources and quizzes
      And access to unassigned content is allowed
    When I am go to the *Home* page
    Then I can see the *Continue learning on your own* section
      And the above mentioned resources are displayed
    When I click on a resource card
    Then I can see and interact with the resource

  Scenario: User can see the *Explore channels* section
    Given I have completed all my class resources and quizzes
      And access to unassigned content is allowed
    When I go to the *Home* page
    Then I see the *Explore channels* section
      And I can see the channels available on the device
    When I click on a channel
    Then I can go to the channel page
    When there are more than three channels
    Then I can see only the first three channels and a *View all* link to the *Library* page
