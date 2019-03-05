Feature: Lessons notifications
  Class coaches and facility coaches need to be able to see all notifications (*started*, *completed*, and *needs help*) when students engage with lessons.

  # START testing this scenario with a FRESH DB (make a copy of the current if you want to reuse it later), and use the `kolibri manage importusers your-csv-file.csv` command to import a set of users for this case.
  
  # Prepare four browsers, or three windows/tabs of the same browser, one of them being incognito/private mode, in order to sign into three as learner users, and as a coach in the other

  Background:
    Given I have all sessions visible in four browser windows/tabs (signed into three as <learner>, and in the other as <coach>)
      And I am signed into Kolibri as a <class coach> or <coach>
      And there three <learner> users enrolled in class <class> I am assigned to
      And the <learners> are not assigned to any groups
      And I have a lesson <lesson> with one exercise assigned to the entire class

  Scenario: Each of the three learners start the resource in the lesson
  	When as learner 1 <learner> in one window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <lesson> 
  	  And I start the resource in the <lesson>
  	Then as <coach> in another window I navigate to *Coach > Class Home* page
  	  And I look into the recent activity area
  	Then I see one *'<learner>' started '<lesson>'* notification
  	  And I should see another *'<learner>' started '<resource>' notification
  	When I click the lesson notification
  	Then I should be directed to that lesson's report page
  	  And I should see a list of the learners who have started the lesson
  	When I click the lesson resource notification
  	Then I should be directed to the lesson resource's report page
  	  And I should see a list of learners and their progress status on the resource

  When as learner 2 <learner> in one window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <lesson> 
  	  And I start the resource in the <lesson>
  	Then as <coach> in another window I navigate to *Coach > Class Home* page
  	  And I look into the recent activity area
  	Then I see one *'<learner>' and 1 other started '<lesson>'* notification
  	  And I should see another *'<learner>' and 1 other started '<resource>' notification
  	When I click the lesson notification
  	Then I should be directed to that lesson's report page
  	  And I should see a list of the learners who have started the lesson
  	When I click the lesson resource notification
  	Then I should be directed to the lesson resource's report page
  	  And I should see a list of learners and their progress status on the resource

  When as learner 3 <learner> in one window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <lesson> 
  	  And I start the resource in the <lesson>
  	Then as <coach> in another window I navigate to *Coach > Class Home* page
  	  And I look into the recent activity area
  	Then I see one *Everyone started '<lesson>'* notification
  	  And I should see another *Everyone started '<resource>' notification
  	When I click the lesson notification
  	Then I should be directed to that lesson's report page
  	  And I should see a list of the learners who have started the lesson
  	When I click the lesson resource notification
  	Then I should be directed to the lesson resource's report page
  	  And I should see a list of learners and their progress status on the resource

  Scenario: Each of the three learners complete the resource in the lesson
  	When as learner 1 <learner> in one window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <lesson> 
  	  And I finish the resource in the <lesson>
  	Then as <coach> in another window I navigate to *Coach > Class Home* page
  	  And I look into the recent activity area
  	Then I see one *'<learner>' completed '<lesson>'* notification
  	  And I should see another *'<learner>' completed '<resource>' notification
  	When I click the lesson notification
  	Then I should be directed to that lesson's report page
  	  And I should see a list of the learners who have completed the lesson
  	When I click the lesson resource notification
  	Then I should be directed to the lesson resource's report page
  	  And I should see a list of learners and their progress status on the resource

  When as learner 2 <learner> in one window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <lesson> 
  	  And I finish the resource in the <lesson>
  	Then as <coach> in another window I navigate to *Coach > Class Home* page
  	  And I look into the recent activity area
  	Then I see one *'<learner>' and 1 other completed '<lesson>'* notification
  	  And I should see another *'<learner>' and 1 other completed '<resource>' notification
  	When I click the lesson notification
  	Then I should be directed to that lesson's report page
  	  And I should see a list of the learners who have completed the lesson
  	When I click the lesson resource notification
  	Then I should be directed to the lesson resource's report page
  	  And I should see a list of learners and their progress status on the resource

  When as learner 3 <learner> in one window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <lesson> 
  	  And I finish the resource in the <lesson>
  	Then as <coach> in another window I navigate to *Coach > Class Home* page
  	  And I look into the recent activity area
  	Then I see one *Everyone completed '<lesson>'* notification
  	  And I should see another *Everyone completed '<resource>' notification
  	When I click the lesson notification
  	Then I should be directed to that lesson's report page
  	  And I should see a list of the learners who have completed the lesson
  	When I click the lesson resource notification
  	Then I should be directed to the lesson resource's report page
  	  And I should see a list of learners and their progress status on the resource

  Scenario: One of the three learners needs help on the lesson
  	When as learner <learner> in one window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <lesson> 
  	  And I get multiple incorrect attempts on at least one question in the exercise
  	Then as <coach> in another window I navigate to *Coach > Class Home* page
  	  And I look into the recent activity area
  	Then I see one *'<learner>' needs help on '<resource>'* notification
  	When I click the lesson resource notification
  	Then I should be directed to the lesson resource's report page
  	  And I should see a list of learners and their progress status on the resource
  	  And I should see which learners need help

  Scenario: two of the three learners need help on the lesson
  	When as learner 2 <learner> in another window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <lesson> 
  	  And I get multiple incorrect attempts on at least one question in the exercise
  	Then as <coach> in another window I navigate to *Coach > Class Home* page
  	  And I look into the recent activity area
  	Then I see one *'<learner>' and 1 other need help on '<resource>'* updated notification
  	When I click the lesson resource notification
  	Then I should be directed to the lesson resource's report page
  	  And I should see a list of learners and their progress status on the resource
  	  And I should see which learners need help

  Scenario: all learners needs help on the lesson
  	When as learner 3 <learner> in another window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <lesson> 
  	  And I get multiple incorrect attempts on at least one question in the exercise
  	Then as <coach> in another window I navigate to *Coach > Class Home* page
  	  And I look into the recent activity area
  	Then I see one *Everyone needs help on '<resource>'* updated notification
  	When I click the lesson resource notification
  	Then I should be directed to the lesson resource's report page
  	  And I should see a list of learners and their progress status on the resource
  	  And I should see which learners need help
