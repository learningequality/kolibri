Feature: General navigation on the *Reports* tab

  Background: 
    Given I am signed in as a facility or class coach
      And I am on *Coach - '<class>' > Reports* tab

  Scenario: Navigate back to the class list
    Given there are 2 or more classes in the facility
      And I am on any of the subtabs *Lessons/Quizzes/Groups/Learners* 
        When I click on *Class home*
        Then I am on *Coach - '<class>' > Class home* page
          And I see the high level summary for <class>, and blocks for *Quizzes*, *Lessons* and *Class activity*
        When I click *All classes* link
        Then I am back on *Coach - '<class>' > Classes*
          And I see the list of classes

  Scenario: Navigate back to the list of lessons
    Given that I am on the *Coach - '<class>' > Reports > Lessons > '<lesson>'* details page
      When I click *All lessons* link
      Then I am back to the *Coach - '<class>' > Reports > Lessons* subtab
        And I see the list of lessons

  Scenario: Navigate back to the list of quizzes
    Given that I am on the *Coach - '<class>' > Reports > Quizzes > '<quiz>'* details page
      When I click *All quizzes* link
      Then I am back to the *Coach - '<class>' > Reports > Quizzes* subtab
        And I see the list of quizzes

  Scenario: Navigate back to the list of groups
    Given that I am on the *Coach - '<class>' > Reports > Groups > '<group>'* details page
      When I click *All groups* link
      Then I am back to the *Coach - '<class>' > Reports > Groups* subtab
        And I see the list of groups

  Scenario: Navigate back to the list of learners
    Given that I am on the *Coach - '<class>' > Reports > Learners > '<learner>'* details page
      When I click *All learners* link
      Then I am back to the *Coach - '<class>' > Reports > Learners* subtab
        And I see the list of learners
