Feature: Non-quiz/lesson resource notifications
  Class coaches and facility coaches need to be able to see started and completed notifications for when students engage with resources outside of lessons and quizzes.

  # START testing this scenario with a FRESH DB (make a copy of the current if you want to reuse it later), and use the `kolibri manage importusers your-csv-file.csv` command to import a set of users for this case.
  
  # Prepare three browsers, or three windows/tabs of the same browser, two of them being incognito/private mode, in order to sign into two as learner users, and as a coach in the other

  Background:
    Given I have all sessions visible in three browser windows/tabs (signed into two as <learner>, and in the other as <coach>)
      And I am signed in to Kolibri as a <class coach> or <coach>
      And there two <learner> users enrolled in class <class> I am assigned to
      And the <learners> are not assigned to any groups
      And the <learners> do not have any lessons or quizzes assigned
  
  Scenario: One learner starts an exercise in Learn
  	When as learner <learner> in one window I go to the *Learn > Class* page for <class>
    Then I go to the channels tab
      And I search for and start any <exercise>
  	Then as <coach> in another window I navigate to the *Coach > Class Home* page
  	 And I look in the recent activity area
  	Then I see the *'<learner>' has started '<exercise>'* notification

  Scenario: One learner completes an exercise in Learn
    When as learner <learner> in one window I go to the *Learn > Class* page for <class>
    Then I go to the channels tab
      And I search for and complete any <exercise>
    Then as <coach> in another window I navigate to the *Coach > Class Home* page
     And I look in the recent activity area
    Then I see the *'<learner>' has completed '<exercise>'* notification

  Scenario: One learner starts a video in Learn
    When as learner <learner> in one window I go to the *Learn > Class* page for <class>
    Then I go to the channels tab
      And I search for and start any <video>
    Then as <coach> in another window I navigate to the *Coach > Class Home* page
     And I look in the recent activity area
    Then I see the *'<learner>' has started '<video>'* notification

  Scenario: One learner completes a video in Learn
    When as learner <learner> in one window I go to the *Learn > Class* page for <class>
    Then I go to the channels tab
      And I search for and complete any <video>
    Then as <coach> in another window I navigate to the *Coach > Class Home* page
     And I look in the recent activity area
    Then I see the *'<learner>' has completed '<video>'* notification

  Scenario: One learner starts a video and one learner starts an exercise at the same time
    When as learner <learner> in one window I go to the *Learn > Class* page for <class>
    Then I go to the channels tab
      And I search and start any <video>
    Then as a second <learner> in another window I go to the *Learn > Class* page for <class>
      And I search and start any <exercise>
    Then as <coach> in another window I navigate to the *Coach > Class Home* page
      And I look in the recent activity area
    Then I see one *'<learner>' has started '<video>'* notification
    Then I see another *'<learner>' has started '<exercise>'* notification

  Scenario: One learner completes a video and one learner completes an exercise at the same time
  	When as learner <learner> in one window I go to the *Learn > Class* page for <class>
    Then I go to the channels tab
      And I search and start and complete any <video>
    Then as a second <learner> in another window I go to the *Learn > Class* page for <class>
      And I search and start and complete any <exercise>
    Then as <coach> in another window I navigate to the *Coach > Class Home* page
      And I look in the recent activity area
    Then I see one *'<learner>' has completed '<video>'* notification
    Then I see another *'<learner>' has completed '<exercise>'* notification
