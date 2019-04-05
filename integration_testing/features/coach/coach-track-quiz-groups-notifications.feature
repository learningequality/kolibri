Feature: Quiz notifications for multiple groups
  Class coaches and facility coaches need to be able to see all notifications (*started* and *completed*) when groups of learners start and complete quizzes

  # START testing this scenario with a FRESH DB (make a copy of the current if you want to reuse it later), and use the `kolibri manage importusers your-csv-file.csv` command to import a set of users for this case.
  
  # Prepare four browsers, or three windows/tabs of the same browser, one of them being incognito/private mode, in order to sign into five as learner users, and as a coach in the other
 
  Background:
    Given I have all sessions visible in four browser windows/tabs (signed into three as <learner>, and in the other as <coach>)
      And I am signed in to Kolibri as a <class coach> or <coach>
      And there three <learner> users enrolled in class <class> I am assigned to
      And two learners <learners> are assigned to Group 1
      And one learner <learner> is assigned to Group 2
      And I have Quiz A <quiz> assigned to Group 1
      And I have Quiz B <quiz> assigned to Group 2

   Scenario: Group 1 starts Quiz A
   	 When as a learner in Group 1 <learner> in one window I go to *Learn > Class* page for <class>
  	 Then I click into the assigned <quiz> 
  	  And I start the <quiz>
  	 Then as learner 2 in Group 1 <learner> in one window I go to *Learn > Class* page for <class>
  	 Then I click into the assigned <quiz>
  	  And I start the <quiz>
  	 Then as <coach> in another window I navigate to *Coach > Class Home* page
  	  And I look into the recent activity area
  	 Then I see a *Everyone started '<quiz>'* group notification
  	 When I click the notification
  	 Then I should be directed to the report for that quiz
  	  And I should see the quiz details 
  	  And I should see a list of 2 learners who started the quiz

   Scenario: Group 2 Starts Quiz B
   	 When as a learner in Group 2 <learner> in one window I go to *Learn > Class* page for <class>
  	 Then I click into the assigned <quiz> 
  	  And I start the <quiz>
  	 Then as <coach> in another window I navigate to *Coach > Class Home* page
  	  And I look into the recent activity area
  	 Then I see one *'<learner>' started '<quiz>'* group notification
  	 When I click the notification
  	 Then I should be directed to the quiz report for that learner
  	  And I should see the learner's attempts on the quiz questions

   Scenario: Group 1 completes Quiz A
     When as a learner in Group 1 <learner> in one window I go to *Learn > Class* page for <class>
  	 Then I click into the assigned <quiz> 
  	  And I start and finish the <quiz>
  	 Then as learner 2 in Group 1 <learner> in one window I go to *Learn > Class* page for <class>
  	 Then I click into the assigned <quiz>
  	  And I start and finish the <quiz>
  	 Then as <coach> in another window I navigate to *Coach > Class Home* page
  	  And I look into the recent activity area
  	 Then I see a *Everyone finished '<quiz>'* group notification
  	 When I click the notification
  	 Then I should be directed to the report for that quiz
  	  And I should see the quiz details 
  	  And I should see a list of 2 learners who completed the quiz

   Scenario: Group 2 completes Quiz B
   	 When as a learner in Group 2 <learner> in one window I go to *Learn > Class* page for <class>
  	 Then I click into the assigned <quiz> 
  	  And I start and finish the <quiz>
  	 Then as <coach> in another window I navigate to *Coach > Class Home* page
  	  And I look into the recent activity area
  	 Then I see one *'<learner>' completed '<quiz>'* group notification
  	 When I click the notification
  	 Then I should be directed to the quiz report for that learner
  	  And I should see the learner's attempts on the quiz questions
  	  And I should see a quiz score
