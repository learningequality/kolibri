
Feature: Coach reviews summary progress on a lesson

# Prepare two browsers, or two windows/tabs of the same browser, one of them being incognito/private mode, in order to sign in into one as a learner user, and as a coach in the other
  
  Background:
    Given I have both sessions visible in two browser windows/tabs (signed into one as learner, and in the other as coach)
      And there are 3 learners enrolled in the class <class>: <learner1>, <learner2> and <learner3>
      And there is lesson <lesson> with 1 video <video> assigned to class <class> 

  Scenario: Review progress before the first learner starts the lesson
    When as learner <learner1> in one window I go to the *Learn > Class* page for <class>
    Then I see there's a lesson assigned to me that I have not started
      But I don't do anything else
    When as a coach <coach> in another window I go to the *Coach - '<class>' > Reports > Lessons > '<lesson>' > Report* subtab
    Then I see the progress for <video> is *3 have not started*
    When I go to the *Coach - '<class>' > Reports > Lessons > '<lesson>' > Learners* subtab
    Then I see the value for progress for all learners is *Has not started*

  Scenario: Learner1 starts the lesson
    When I as a <learner1> click to open the <lesson> lesson
      And I start the <video>
    Then within 5 seconds as a coach <coach> in *Coach - '<class>' > Reports > Lessons > '<lesson>' > Report* subtab I see *Progress* for <video> is *1 of 3 has started*
    When I go to the *Coach - '<class>' > Reports > Lessons > '<lesson>' > Learners* subtab
    Then I see the value for progress for <learner1> is *Started*
    
  Scenario: Learner1 completes the lesson
    When I as a <learner1> finish the <video>
    Then as a coach <coach> in *Coach - '<class>' > Reports > Lessons > '<lesson>' > Report* subtab I see *Progress* for <video> is *Completed by 1 of 3*
    When I go to the *Coach - '<class>' > Reports > Lessons > '<lesson>' > Learners* subtab
    Then I see the value for progress for <learner1> is *Completed*

  Scenario: Learner2 starts the lesson
    When I as a <learner2> click to open the <lesson> lesson
      And I start the <video>
    Then within 5 seconds as a coach <coach> in *Coach - '<class>' > Reports > Lessons > '<lesson>' > Report* subtab I see *Progress* for <video> is *Completed by 1 of 3; 1 started*
    When I go to the *Coach - '<class>' > Reports > Lessons > '<lesson>' > Learners* subtab
    Then I see the value for progress for <learner1> is *Completed*
      And the value for progress for <learner2> is *Started*
    
  Scenario: Learner2 completes the lesson
    When I as a <learner2> finish the <video>
    Then as a coach <coach> in *Coach - '<class>' > Reports > Lessons > '<lesson>' > Report* subtab I see *Progress* for <video> is *Completed by 2 of 3*
    When I go to the *Coach - '<class>' > Reports > Lessons > '<lesson>' > Learners* subtab
    Then I see the value for progress for both <learner1> and <learner2> is *Completed*

  Scenario: Learner3 starts the lesson
    When I as a <learner3> click to open the <lesson> lesson
      And I start the <video>
    Then within 5 seconds as a coach <coach> in *Coach - '<class>' > Reports > Lessons > '<lesson>' > Report* subtab I see *Progress* for <video> is *Completed by 2 of 3; 1 started*
    When I go to the *Coach - '<class>' > Reports > Lessons > '<lesson>' > Learners* subtab
    Then I see the value for progress for <learner1> and <learner2> is *Completed*
      And the value for progress for <learner3> is *Started*
    
  Scenario: Learner3 completes the lesson
    When I as a <learner3> finish the <video>
    Then as a coach <coach> in *Coach - '<class>' > Reports > Lessons > '<lesson>' > Report* subtab I see *Progress* for <video> is *Completed by all 3*
    When I go to the *Coach - '<class>' > Reports > Lessons > '<lesson>' > Learners* subtab
    Then I see the value for progress for all 3 learners is *Completed*
