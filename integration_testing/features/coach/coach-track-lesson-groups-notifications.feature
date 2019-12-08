Feature: Lessons notifications for multiple groups
  Class coaches and facility coaches need to be able to see all notifications (*started*, *completed*, and *needs help*) when groups of learners engage with lessons.
  
  # Prepare four browsers, or three windows/tabs of the same browser, one of them being incognito/private mode, in order to sign into three as learner users, and as a coach in the other
  
  Background:
    Given I have all sessions visible in four browser windows/tabs (signed into three as learners, and in the other as <coach>)
      And I am signed in to Kolibri as a facility or class <coach>
      And there are three learners enrolled in class <class> I am assigned to
      And <learner1> and <learner2> are assigned to <group1>
      And <learner3> is assigned to <group2>
      And I have a lesson <lesson> with one exercise <exercise> assigned to the two groups

  Scenario: Multiple groups start on a lesson
  	When as each learner in <group1> in another window I go to *Learn > Class* page for <class>
  	Then I click into the assigned <lesson>
  	  And I start the <exercise> in the <lesson>
  	Then as <coach> in another window I navigate to *Coach - '<class>' > Class Home* page
  	  And I look into the *Class activity* block
  	Then I see one *'<learner1>' and 1 other started '<exercise>'* for <group1> notification
  	 And I see one *'<learner3>' started on '<exercise>'* for <group2> notification
  	When I click on the <group1> notification
  	Then I see lesson <exercise> report page
  	  And I see a table with <learner1> and <learner2>, and their progress status on the <exercise>
  	When I click on the <group2> notification
  	Then I see the lesson <exercise> report page
  	  And I see a table with <learner3> progress status on the <exercise>
  
  Scenario: Multiple groups complete on a lesson
  	Given that as each learner in another window I complete the <exercise> in the <lesson>
  	  And as <coach> in another window I am at *Coach - '<class>' > Class Home* page
      	When I look at *Class activity* block
      	Then I see *Everyone completed '<exercise>'* <group1> notification
      	  And I see one *Everyone completed '<exercise>'* <group2> notification
      	When I click on the <group1> notification
        Then I see lesson <exercise> report page
          And I see a table with <learner1> and <learner2>, and their completed status on the <exercise>
        When I click on the <group2> notification
        Then I see the lesson <exercise> report page
          And I see a table with <learner3> completed status on the <exercise>

  Scenario: Multiple groups need help on a lesson
    Given that as each learner in <group1> and <group2> in another window I go to *Learn > '<class>' > '<lesson>'*
      And I get multiple incorrect attempts on at least one question in the exercise
      And as <coach> in another window I see *Coach - '<class>' > Class Home* page
      	When I look at *Class activity* block
      	Then I see one *Everyone needs help on '<exercise>'* <group1> notification
      	  And I see one *'<Learner>' needs help on '<exercise>'* <group2> notification
       	When I click on the <group1> notification
        Then I see lesson <exercise> report page
          And I see a table with <learner1> and <learner2>, and their need help status on the <exercise>
        When I click on the <group2> notification
        Then I see the lesson <exercise> report page
          And I see a table with <learner3> need help status on the <exercise>
