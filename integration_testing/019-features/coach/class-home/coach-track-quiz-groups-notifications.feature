Feature: Quiz notifications for multiple groups
  Class coaches and facility coaches need to be able to see all notifications (*started* and *completed*) when groups of learners start and complete quizzes

  Background:
    Given I am signed in to Kolibri as a class coach
      And as a coach I have assigned a quiz to a group of learners and started it
      And in a different browser I am signed in to Kolibri as a learner from the group #or using a browser tab in incognito mode; repeat the following scenarios with different learners to test multiple notifications

  Scenario: Class activity - Coach sees a notification that a group learner has started the quiz
  	Given the coach is at *Coach > '<class>' > Class Home* page
  		And a learner from the group has started filling in the quiz at *Learn > Class > <class>*
  	When as a coach I look into the *Class activity* section
  	Then I see a *'<group>'' • '<quiz>'' '<learner>' started '<quiz>'* notification
  	When I click the notification link
  	Then I see the quiz report for the learner
  	  And I see the correctly updated quiz data such as status, score, questions answered, time spent and attempted
  	  And I see the correct answer history and question details

  Scenario: Class activity - Coach sees a notification that a group learner has completed the quiz
  	Given the coach is at *Coach > '<class>' > Class Home* page
  		And a learner from the group has submitted the quiz at *Learn > Class > <class>*
  	When as a coach I look into the *Class activity* section
  	Then I see a *'<group>'' • '<quiz>'' '<learner>' completed '<quiz>'* notification
  	When I click the notification link
  	Then I see the correctly updated quiz report for the learner
  	  And I see the quiz data such as status, score, questions answered, time spent and attempted
  	  And I see the correct answer history and question details

  Scenario: Class activity - Coach sees a notification that everyone from the group has started/completed the quiz
  	Given the coach is at *Coach > '<class>' > Class Home* page
  		And all the learners in the group have started filling in the quiz at *Learn > Class > <class>*
  	When as a coach I look into the *Class activity* section
  	Then I see an *'<group>'' • '<quiz>''Everyone in '<group>' started '<quiz>'* notification
  	When I click the notification link
  	Then I see the quiz report for the learners
  	  And I see the correctly updated quiz data such as status, score, questions answered, time spent and attempted
  	  And I see the correct answer history and question details
  	When all the learners in the group have submitted the quiz at *Learn > Class > <class>*
  		And as a coach I look into the *Class activity* section
  	Then I see an *'<group>'' • '<quiz>''Everyone in '<group>' completed '<quiz>'* notification
  	When I click the notification link
  	Then I see the quiz report for the learners
  	  And I see the correctly updated quiz data such as status, score, questions answered, time spent and attempted
  	  And I see the correct answer history and question details

  Scenario: Quizzes section - Coach sees a notification that a learner from the group has started the quiz
  	Given the coach is at *Coach > '<class>' > Class Home* page
  		And the learner has started filling in the quiz at *Learn > Class > <class>*
  	When as a coach I look into the *Quizzes* section
  	Then I see a *N of N has started* notification
  		And I see a blue progress bar
  	When I click the quiz card
  	Then I see the quiz details page
  	  And I see all the correctly updated quiz data and learner progress

  Scenario: Quizzes section - Coach sees a notification that a learner from the group has completed the quiz
  	Given the coach is at *Coach > '<class>' > Class Home* page
  		And the learner has submitted the quiz at *Learn > Class > <class>*
  	When as a coach I look into the *Quizzes* section
  	Then I see a *Completed by N of N* notification
  		And I see a yellow progress bar
  	When I click the quiz card
  	Then I see the quiz details page
  	  And I see all the correctly updated quiz data and learner progress
