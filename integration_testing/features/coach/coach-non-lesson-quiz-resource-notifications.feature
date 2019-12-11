Feature: Non-quiz/lesson resource notifications
  Class coaches and facility coaches need to be able to see started and completed notifications for when students engage with resources outside of lessons and quizzes.
  
  # Prepare three browsers, or three windows/tabs of the same browser, two of them being incognito/private mode, in order to sign into two as learner users, and as a coach in the other

  Background:
    Given I have all sessions visible in four browser windows/tabs (signed into three as learners, and in the other as <coach>)
      And I am signed in to Kolibri as a facility or class <coach>
      And there are <learner1> and <learner2> users enrolled in class <class> I am assigned to
      And they are not assigned to any groups
      And they do not have any lessons or quizzes assigned
  
  Scenario: One learner starts an exercise in Learn
  	When as learner <learner1> in one window I go to the *Learn > Class* page for <class>
    Then I go to the *Channels* tab
      And I search for and start any <exercise>
  	Then as <coach> in another window I navigate to the *Coach - '<class>' > Class Home* page
  	  And I look at *Class activity* block
  	Then I see the *'<learner1>' has started '<exercise>'* notification

  Scenario: One learner completes an exercise in Learn
    When as learner <learner1> in one window I go to the *Learn > Class* page for <class>
    Then I go to the *Channels* tab
      And I search for and complete the <exercise>
    Then as <coach> in another window I navigate to the *Coach - '<class>' > Class Home* page
      And I look at *Class activity* block
    Then I see the *'<learner1>' has completed '<exercise>'* notification

  Scenario: One learner starts a video in Learn
    When as learner <learner1> in one window I go to the *Learn > Class* page for <class>
    Then I go to the *Channels* tab
      And I search for and start the <video>
    Then as <coach> in another window I navigate to the *Coach - '<class>' > Class Home* page
      And I look at *Class activity* block
    Then I see the *'<learner1>' has started '<video>'* notification

  Scenario: One learner completes a video in Learn
    When as learner <learner1> in one window I go to the *Learn > Class* page for <class>
    Then I go to the *Channels* tab
      And I search for and complete any <video>
    Then as <coach> in another window I navigate to the *Coach - '<class>' > Class Home* page
      And I look at *Class activity* block
    Then I see the *'<learner1>' has completed '<video>'* notification

  Scenario: One learner starts a video and one learner starts an exercise at the same time
    When as learner <learner1> in one window I go to the *Learn > Class* page for <class>
    Then I go to the *Channels* tab
      And I search and start the <video>
    Then as a second <learner2> in another window I go to the *Learn > Class* page for <class>
      And I search and start the <exercise>
    Then as <coach> in another window I navigate to the *Coach - '<class>' > Class Home* page
      And I look at *Class activity* block
    Then I see one *'<learner1>' has started '<video>'* notification
      And I see another *'<learner2>' has started '<exercise>'* notification

  Scenario: One learner completes a video and one learner completes an exercise at the same time
  	When as learner <learner2> in one window I go to the *Learn > Class* page for <class>
    Then I go to the *Channels* tab
      And I search and start and complete the <video>
    Then as a second <learner1> in another window I go to the *Learn > Class* page for <class>
      And I search and start and complete any <exercise>
    Then as <coach> in another window I navigate to the *Coach - '<class>' > Class Home* page
      And I look at *Class activity* block
    Then I see one *'<learner2>' has completed '<video>'* notification
      And I see another *'<learner1>' has completed '<exercise>'* notification
