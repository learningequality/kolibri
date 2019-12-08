Feature: Quiz notifications for multiple groups
  Class coaches and facility coaches need to be able to see all notifications (*started* and *completed*) when groups of learners start and complete quizzes
  
  # Prepare four browsers, or three windows/tabs of the same browser, one of them being incognito/private mode, in order to sign into five as learner users, and as a coach in the other
 
  Background:
    Given I have all sessions visible in four browser windows/tabs (signed into three as learners, and in the other as <coach>)
      And I am signed in to Kolibri as a facility or class <coach>
      And there are three learners enrolled in class <class> I am assigned to
      And <learner1> and <learner2> are assigned to <group1>
      And <learner3> is assigned to <group2>
      And I have assigned <quiz1> to <group1>
      And I have assigned <quiz2> to <group2>

    Scenario: <group1> starts <quiz1>
   	  When as <learner1> and <learner2> in one window I go to *Learn > '<class>' > '<quiz1>'* page
  	    And I start the <quiz1>
        And as <coach> in another window I am at *Coach - '<class>' > Class Home* page
  	  When as <coach> I look at *Class activity* block
  	  Then I see the *Everyone started '<quiz1>'* group notification
  	  When I click the notification
  	  Then I see the report for <quiz1>
  	    And I see the quiz details 
  	    And I see the table with <learner1> and <learner2> who started the quiz

    Scenario: <group2> starts <quiz2>
   	  When as <learner3> in one window I go to *Learn > Class* page for <class>
  	    And I start the <quiz2>
  	    And as <coach> in another window I am at *Coach - '<class>' > Class Home* page
      When as <coach> I look at *Class activity* block
  	  Then I see one *'<learner3>' started '<quiz2>'* group notification
  	  When I click the notification
      Then I see the report for <quiz2>
        And I see the quiz details 
        And I see the table with <learner3> who started the quiz

    Scenario: <group1> completes <quiz1>
      When as <learner1> and <learner2> in one window I go to *Learn > '<class>' > '<quiz1>'* page
        And I complete the <quiz1>
        And as <coach> in another window I am at *Coach - '<class>' > Class Home* page
      When as <coach> I look at *Class activity* block
      Then I see the *Everyone completed '<quiz1>'* group notification
      When I click the notification
      Then I see the report for <quiz1>
        And I see the quiz details 
        And I see the table with <learner1> and <learner2> who completed the quiz

    Scenario: <group2> completes <quiz2>
      When as <learner3> in one window I go to *Learn > Class* page for <class>
        And I complete the <quiz2>
        And as <coach> in another window I am at *Coach - '<class>' > Class Home* page
      When as <coach> I look at *Class activity* block
      Then I see one *'<learner3>' completed '<quiz2>'* group notification
      When I click the notification
      Then I see the report for <quiz2>
        And I see the quiz details 
        And I see the table with <learner3> who completed the quiz
