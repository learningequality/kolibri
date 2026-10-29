Feature: Lessons notifications
  Class coaches and facility coaches need to be able to see all notifications (*started*, *completed*, and *needs help*) when students engage with lessons.

  Background:
    Given I am signed in to Kolibri as a class coach
      And as a coach I have assigned a lesson with one exercise to the entire class and started it
      And there are learners enrolled in the class
      And in a different browser I am signed in to Kolibri as a learner #or using a browser tab in incognito mode; repeat the following scenarios with different learners to test multiple notifications

  Scenario: Class activity - Coach sees a notification that a learner has started the lesson
  	Given the coach is at *Coach > '<class>' > Class Home* page
  		And the learner has started giving answers to the exercise at *Learn > Class > <class>*
  	When as a coach I look into the *Class activity* section
  	Then I see a *'<learner>' started '<lesson>'* notification
  	When I click the notification link
  	Then I see the lesson report for the learner
  	  And I see the correctly updated lesson data such as status, time spent and progress

  Scenario: Class activity - Coach sees a notification that a learner has completed the lesson
  	Given the coach is at *Coach > '<class>' > Class Home* page
  		And the learner has just completed the exercise at *Learn > Class > <class>*
  	When as a coach I look into the *Class activity* section
  	Then I see a *'<learner>' completed '<lesson>'* notification
  	When I click the notification link
  	Then I see the correctly updated lesson report for the learner

  Scenario: Class activity - Coach sees a notification that everyone from the class has started/completed the lesson
  	Given the coach is at *Coach > '<class>' > Class Home* page
  		And all the learners in the class have started the lesson at *Learn > Class > <class>*
  	When as a coach I look into the *Class activity* section
  	Then I see an *Everyone started '<lesson>'* notification
  	When I click the notification link
  	Then I see the lesson report for the learners
  	  And I see the correctly updated lesson data
  	When all the learners in the class have completed the lesson at *Learn > Class > <class>*
  		And as a coach I look into the *Class activity* section
  	Then I see an *Everyone completed '<lesson>'* notification
  	When I click the notification link
  	Then I see the lesson report for the learners
  	  And I see the correctly updated lesson data

  Scenario: Lessons section - Coach sees a notification that a learner has started the lesson
  	Given the coach is at *Coach > '<class>' > Class Home* page
  		And the learner has started the lesson at *Learn > Class > <class>*
  	When as a coach I look into the *Lessons* section
  	Then I see a *N of N has started* notification
  		And I see a blue progress bar
  	When I click the lesson card
  	Then I see the lesson details page
  	  And I see all the correctly updated lesson data and learner progress

  Scenario: Lessons section - Coach sees a notification that a learner has completed the lesson
  	Given the coach is at *Coach > '<class>' > Class Home* page
  		And the learner has submitted the lesson at *Learn > Class > <class>*
  	When as a coach I look into the *Lessons* section
  	Then I see a *Completed by N of N* notification
  		And I see a yellow progress bar
  	When I click the lesson card
  	Then I see the lesson details page
  	  And I see all the correctly updated lesson data and learner progress

  Scenario: One learner needs help with the exercise in the lesson
    Given that as <learner1> in one window I am at *Learn > '<class>' > '<lesson>'* page
      And I get multiple incorrect attempts on at least one question in the exercise
      And as a coach in another window I am at *Coach - '<class>' > Class Home* page
    When as a coach I look into the *Class activity* block
    Then I see one *'<learner1>' needs help '<lesson>'* notification
      And I see another *'<learner1>' needs help '<exercise>' notification
    When I click the lesson notification
    Then I see lesson report page
      And I see <learner1> needs help in the <lesson>
    When I click the <exercise> notification
    Then I see exercise report page
      And I see <learner1> attempt report on <exercise>

  Scenario: Second learner needs help with the exercise in the lesson
    Given that as <learner2> in one window I am at *Learn > '<class>' > '<lesson>'* page
      And I get multiple incorrect attempts on at least one question in the exercise
      And as a coach in another window I am at *Coach - '<class>' > Class Home* page
    When as a coach I look into the *Class activity* block
    Then I see one *'<learner2>' and 1 other need help '<lesson>'* notification
      And I see another *'<learner2>' and 1 other need help '<exercise>' notification
    When I click the lesson notification
    Then I see <lesson> report page
      And I see both <learner1> and <learner2> need help the lesson
    When I click the exercise notification
    Then I see the exercise report page
      And I see both <learner1> and <learner2> need help status on thw exercise

  Scenario: All three learners need help with the exercise in the lesson
    Given that as <learner3> in one window I am at *Learn > '<class>' > '<lesson>'* page
      And I get multiple incorrect attempts on at least one question in the exercise
      And as <coach> in another window I am at *Coach - '<class>' > Class Home* page
    When as a coach I look into the *Class activity* block
    Then I see one *Everyone need help '<lesson>'* notification
      And I see another *Everyone need help '<exercise>' notification
    When I click the lesson notification
    Then I see the lesson report page
      And I see all three learners need help the lesson
    When I click the exercise notification
    Then I see the exercise report page
      And I see the need help status on the exercise for all three learners
