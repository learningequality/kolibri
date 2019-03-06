Feature: Lessons notifications for multiple groups
  Class coaches and facility coaches need to be able to see all notifications (*started*, *completed*, and *needs help*) when groups of learners engage with lessons.

  # START testing this scenario with a FRESH DB (make a copy of the current if you want to reuse it later), and use the `kolibri manage importusers your-csv-file.csv` command to import a set of users for this case.
  
  # Prepare four browsers, or three windows/tabs of the same browser, one of them being incognito/private mode, in order to sign into three as learner users, and as a coach in the other
  
  Background:
    Given I have all sessions visible in four browser windows/tabs (signed into three as <learner>, and in the other as <coach>)
      And I am signed in to Kolibri as a <class coach> or <coach>
      And there three <learner> users enrolled in class <class> I am assigned to
      And two of the learners are assigned to Group 1
      And one of the learners are assigned to Group 2
      And I have a lesson <lesson> with one exercise assigned to the two groups

  Scenario: Multiple groups start on a lesson
  	When as each learner in Group 1 in another window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <lesson>
  	  And I start the resource in the <lesson>
  	Then as <coach> in another window I navigate to *Coach > Class Home* page
  	  And I look into the recent activity area
  	Then I see one *'<learner>' and 1 other started on '<resource>'* group 1 notification
  	And I see one *'<learner>' started on '<resource>'* group 2 notification
  	When I click on the group 1 started notification
  	Then I should be directed to the lesson resource's report page
  	  And I should see a list of two learners and their progress status on the resource
  	When I click on the group 2 started notifiation
  	Then I should be directed to the lesson resource's report page
  	  And I should see a list of one learner and their progress status on the resource
  
  Scenario: Multiple groups complete on a lesson
  	When as each learner in Group 1 in another window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <lesson>
  	  And I complete the resource in the <lesson>
  	Then as <coach> in another window I navigate to *Coach > Class Home* page
  	  And I look into the recent activity area
  	Then I see one *Everyone completed '<resource>'* group 1 notification
  	And I see one *Everyone completed '<resource>'* group 2 notification
  	When I click on the group 1 completed notification
  	Then I should be directed to the lesson resource's report page
  	  And I should see a list of two learners and their completion status on the resource
  	When I click on the group 2 completed notifiation
  	Then I should be directed to the lesson resource's report page
  	  And I should see a list of one learner and their completion status on the resource

  Scenario: Multiple groups need help on a lesson
    When as each learner in Group 1 and Group 2 in another window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <lesson>
  	  And I get multiple incorrect attempts on at least one question in the exercise
  	Then as <coach> in another window I navigate to *Coach > Class Home* page
  	  And I look into the recent activity area
  	Then I see one *Everyone needs help on '<resource>'* group 1 notification
  	  And I see one *'<Learner>' needs help on '<resource>'* group 2 notification
  	When I click the Group 1 needs help notification
  	Then I should be directed to the lesson resource's report page
  	  And I should see a list of learners in group 1 and their progress status on the resource
  	  And I should see which learners need help
  	When I click on the Group 2 needs help notification
  	Then I should be directed to the lesson resource's report page
  	  And I should see one learner in group 2 and their progress status on the resource
