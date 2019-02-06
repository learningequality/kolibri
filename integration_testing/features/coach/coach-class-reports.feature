Feature: General navigation

  Background: 
    Given I am signed in as a facility or class coach
      And I am on *Coach > Reports* tab

  Scenario: Navigate back to the class list
    Given I am on any of the subtabs *Lessons/Quizzes/Learners/Groups* 
      When I click *All classes* link
      Then I am back on *Coach > Classes*
        And I see the list of classes

  Scenario: Navigate back to the list of lessons
    Given that I am on the *Coach > Reports > Lessons > '<lesson>'* details page
      When I click *All lessons* link
      Then I am back to the *Coach > Reports > Lessons* subtab
        And I see the list of lessons

  Scenario: Navigate back to the list of quizzes
    Given that I am on the *Coach > Reports > Quizzes > '<quiz>'* details page
      When I click *All quizzes* link
      Then I am back to the *Coach > Reports > Quizzes* subtab
        And I see the list of quizzes

  Scenario: Navigate back to the list of groups
    Given that I am on the *Coach > Reports > Groups > '<group>'* details page
      When I click *All groups* link
      Then I am back to the *Coach > Reports > Groups* subtab
        And I see the list of groups

  Scenario: Navigate back to the list of learners
    Given that I am on the *Coach > Reports > Learners > '<learner>'* details page
      When I click *All learners* link
      Then I am back to the *Coach > Reports > Learners* subtab
        And I see the list of learners
