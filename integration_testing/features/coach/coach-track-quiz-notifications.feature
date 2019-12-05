Feature: Quiz notifications
  Class coaches and facility coaches need to be able to see all notifications (*started* and *completed*) when learners start and complete quizzes
  
  # Prepare four browsers, or three windows/tabs of the same browser, one of them being incognito/private mode, in order to sign into five as learner users, and as a coach in the other

  Background:
    Given I have all sessions visible in four browser windows/tabs (signed into three as <learner>, and in the other as <coach>)
      And I am signed in to Kolibri as a <class coach> or <coach>
      And there three <learner> users enrolled in class <class> I am assigned to
      And the <learners> are not assigned to any groups
      And I have a Quiz <quiz> assigned to the entire class

  Scenario: Each of the three learners start the quiz one at a time
  	When as learner 1 <learner> in one window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <quiz> 
  	  And I start the <quiz>
  	Then as <coach> in another window I navigate to *Coach - '<class>' > Class Home* page
  	  And I look into the *Class activity* block
  	Then I see one *'<learner>' started '<quiz>'* notification
  	When I click the notification
  	Then I see quiz report for <learner> 
  	  And I see the learner's attempts on the quiz questions

  	When as learner 2 <learner> in one window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <quiz> 
  	  And I start the <quiz>
  	Then as <coach> in another window I navigate to *Coach - '<class>' > Class Home* page
  	  And I look into the *Class activity* block
  	Then I see *'<learner>' and 1 others started '<quiz>'* notification
  	When I click the notification
  	Then I see <quiz> quiz report details 
  	  And I see a list of 2 learners who started the quiz

  	When as learner 3 <learner> in one window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <quiz> 
  	  And I start the <quiz>
  	Then as <coach> in another window I navigate to *Coach - '<class>' > Class Home* page
  	  And I look into the *Class activity* block
  	Then I see *Everyone started '<quiz>'* notification
  	When I click the notification
  	Then I see <quiz> quiz report details 
      And I see a list of 3 learners who started the quiz

  Scenario: Each of the three learners finish the quiz one at a time
  	When as learner 1 <learner> in one window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <quiz> 
  	  And I start and finish the <quiz>
  	Then as <coach> in another window I navigate to *Coach - '<class>' > Class Home* page
  	  And I look into the *Class activity* block
  	Then I see one *'<learner>' completed '<quiz>'* notification
  	When I click the notification
  	Then I see quiz report for <learner> 
      And I see the learner's attempts on the quiz questions

  	When as learner 2 <learner> in one window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <quiz> 
  	  And I start and finish the <quiz>
  	Then as <coach> in another window I navigate to *Coach - '<class>' > Class Home* page
  	  And I look into the *Class activity* block
  	Then I see *'<learner>' and 1 others completed '<quiz>'* notification
  	When I click the notification
  	Then I see <quiz> quiz report details 
      And I see a list of 2 learners who completed the quiz

  	When as learner 3 <learner> in one window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <quiz> 
  	  And I start and finish the <quiz>
  	Then as <coach> in another window I navigate to *Coach - '<class>' > Class Home* page
  	  And I look into the *Class activity* block
  	Then I see *Everyone completed '<quiz>'* notification
  	When I click the notification
  	Then I see <quiz> quiz report details 
      And I see a list of 3 learners who completed the quiz
