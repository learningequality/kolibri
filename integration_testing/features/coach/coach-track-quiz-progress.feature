Feature: Coach tracks learner progress in a quiz

# Prepare two browsers, or two windows/tabs of the same browser, one of them being incognito/private mode, in order to sign in into one as a learner user, and as a coach in the other
  
  Background:
    Given I have both sessions visible in two browser windows/tabs (signed into one as learner, and in the other as coach)
      And there are learners enrolled to the class <class>
      And there is <learner> enrolled in the group <group>
      And there is quiz <quiz> assigned to group <group>

  Scenario: Learner has not started the quiz   
    When as learner <learner> in one window I go to the *Learn > Class* page for <class>
    Then I see there's a quiz assigned to me that I have not started
    When as a coach <coach> in another window I go to the *Coach - '<class>' > Reports > Groups > '<group>' > Quizzes assigned > '<quiz>'* detail page
    Then I see the <learner> progress is *Has not started*
      And I see the <learner> score is *-*

  Scenario: Learner has started the quiz
    Given I have both sessions visible in two browser windows/tabs
      And in one window I am signed in as learner on a <quiz> quiz page
      And in the other window I am signed in as coach on the *Coach - '<class>' > Reports > Groups > '<group>' > Quizzes assigned > '<quiz>'* detail page
        When as learner <learner> in one window I open the <quiz>
          But I don't do anything else
        Then within 5 seconds as a coach <coach> in another window I see the <learner> progress is *Started*
          And I see the <learner> score is <quiz_score>

  Scenario: Learner completes the quiz
    Given I have both sessions visible in two browser windows/tabs
      And in one window I am signed in as learner on a <quiz> quiz page
      And in the other window I am signed in as coach on the *Coach - '<class>' > Reports > Groups > '<group>' > Quizzes assigned > '<quiz>'* detail page
      And the <quiz> quiz has 2 questions
        When as learner <learner> in one window I get one question correct and one question incorrect
          And I submit the quiz
        Then within 5 seconds as a coach <coach> in another window I see the <learner> progress is *Completed*
          And I see the <learner> score is 50%
          And I see the *Average score* for the group <group> is also 50%
