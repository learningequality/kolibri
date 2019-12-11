Feature: Lessons notifications
  Class coaches and facility coaches need to be able to see all notifications (*started*, *completed*, and *needs help*) when students engage with lessons.
  
  # Prepare four browsers, or three windows/tabs of the same browser, one of them being incognito/private mode, in order to sign into three as learner users, and as a coach in the other

  Background:
    Given I have all sessions visible in four browser windows/tabs (signed into three as learners, and in the other as <coach>)
      And I am signed in to Kolibri as a facility or class <coach>
      And there are three learners enrolled in class <class> I am assigned to
      And they are not assigned to any groups
      And I have a lesson <lesson> with one <exercise> assigned to the entire class

  Scenario: One learner starts the exercise in the lesson
  	Given that as <learner1> in one window I am at *Learn > '<class>' > '<lesson>'* page
      And I started the <exercise> in the <lesson>
  	  And as <coach> in another window I am at *Coach - '<class>' > Class Home* page
      	When as <coach> I look into the *Class activity* block
      	Then I see one *'<learner1>' started '<lesson>'* notification
      	  And I see another *'<learner1>' started '<exercise>' notification
      	When I click the <lesson> notification
      	Then I see <lesson> report page
      	  And I see <learner1> who have started the lesson
      	When I click the <exercise> notification
      	Then I see <exercise> report page
      	  And I see <learner1> attempt report on <exercise>

  Scenario: Second learner starts the exercise in the lesson
    Given that as <learner2> in one window I am at *Learn > '<class>' > '<lesson>'* page
      And I started the <exercise> in the <lesson>
      And as <coach> in another window I am at *Coach - '<class>' > Class Home* page
        When as <coach> I look into the *Class activity* block
        Then I see one *'<learner2>' and 1 other started '<lesson>'* notification
          And I see another *'<learner2>' and 1 other started '<exercise>' notification
        When I click the <lesson> notification
        Then I see <lesson> report page
          And I see both <learner1> and <learner2> have started the lesson
        When I click the <exercise> notification
        Then I see <exercise> report page
          And I see both <learner1> and <learner2> progress status on <exercise>

  Scenario: All three learners start the exercise in the lesson
    Given that as <learner3> in one window I am at *Learn > '<class>' > '<lesson>'* page
      And I started the <exercise> in the <lesson>
      And as <coach> in another window I am at *Coach - '<class>' > Class Home* page
        When as <coach> I look into the *Class activity* block
        Then I see one *Everyone started  '<lesson>'* notification
          And I see another *Everyone started '<exercise>' notification
        When I click the <lesson> notification
        Then I see <lesson> report page
          And I see all three learners have started the lesson
        When I click the <exercise> notification
        Then I see <exercise> report page
          And I see the progress status on <exercise> for all three learners

  Scenario: First learner completes the exercise in the lesson
    Given that as <learner1> in one window I am at *Learn > '<class>' > '<lesson>'* page
      And I completed the <exercise> in the <lesson>
      And as <coach> in another window I am at *Coach - '<class>' > Class Home* page
        When as <coach> I look into the *Class activity* block
        Then I see one *'<learner1>' completed '<lesson>'* notification
          And I see another *'<learner1>' completed '<exercise>' notification
        When I click the <lesson> notification
        Then I see <lesson> report page
          And I see <learner1> who have completed the lesson
        When I click the <exercise> notification
        Then I see <exercise> report page
          And I see <learner1> attempt report on <exercise>

  Scenario: Second learner completes the exercise in the lesson
    Given that as <learner2> in one window I am at *Learn > '<class>' > '<lesson>'* page
      And I completed the <exercise> in the <lesson>
      And as <coach> in another window I am at *Coach - '<class>' > Class Home* page
        When as <coach> I look into the *Class activity* block
        Then I see one *'<learner2>' and 1 other completed '<lesson>'* notification
          And I see another *'<learner2>' and 1 other completed '<exercise>' notification
        When I click the <lesson> notification
        Then I see <lesson> report page
          And I see both <learner1> and <learner2> have completed the lesson
        When I click the <exercise> notification
        Then I see <exercise> report page
          And I see both <learner1> and <learner2> completed status on <exercise>

  Scenario: All three learners complete the exercise in the lesson
    Given that as <learner3> in one window I am at *Learn > '<class>' > '<lesson>'* page
      And I completed the <exercise> in the <lesson>
      And as <coach> in another window I am at *Coach - '<class>' > Class Home* page
        When as <coach> I look into the *Class activity* block
        Then I see one *Everyone completed '<lesson>'* notification
          And I see another *Everyone completed '<exercise>' notification
        When I click the <lesson> notification
        Then I see <lesson> report page
          And I see all three learners have completed the lesson
        When I click the <exercise> notification
        Then I see <exercise> report page
          And I see the completed status on <exercise> for all three learners

  Scenario: One learner needs help with the exercise in the lesson
    Given that as <learner1> in one window I am at *Learn > '<class>' > '<lesson>'* page
      And I get multiple incorrect attempts on at least one question in the <exercise>
      And as <coach> in another window I am at *Coach - '<class>' > Class Home* page
        When as <coach> I look into the *Class activity* block
        Then I see one *'<learner1>' needs help '<lesson>'* notification
          And I see another *'<learner1>' needs help '<exercise>' notification
        When I click the <lesson> notification
        Then I see <lesson> report page
          And I see <learner1> needs help in the <lesson>
        When I click the <exercise> notification
        Then I see <exercise> report page
          And I see <learner1> attempt report on <exercise>

  Scenario: Second learner needs help with the exercise in the lesson
    Given that as <learner2> in one window I am at *Learn > '<class>' > '<lesson>'* page
      And I get multiple incorrect attempts on at least one question in the <exercise>
      And as <coach> in another window I am at *Coach - '<class>' > Class Home* page
        When as <coach> I look into the *Class activity* block
        Then I see one *'<learner2>' and 1 other need help '<lesson>'* notification
          And I see another *'<learner2>' and 1 other need help '<exercise>' notification
        When I click the <lesson> notification
        Then I see <lesson> report page
          And I see both <learner1> and <learner2> need help the lesson
        When I click the <exercise> notification
        Then I see <exercise> report page
          And I see both <learner1> and <learner2> need help status on <exercise>

  Scenario: All three learners need help with the exercise in the lesson
    Given that as <learner3> in one window I am at *Learn > '<class>' > '<lesson>'* page
      And I get multiple incorrect attempts on at least one question in the <exercise>
      And as <coach> in another window I am at *Coach - '<class>' > Class Home* page
        When as <coach> I look into the *Class activity* block
        Then I see one *Everyone need help '<lesson>'* notification
          And I see another *Everyone need help '<exercise>' notification
        When I click the <lesson> notification
        Then I see <lesson> report page
          And I see all three learners need help the lesson
        When I click the <exercise> notification
        Then I see <exercise> report page
          And I see the need help status on <exercise> for all three learners
