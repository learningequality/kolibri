Feature: Coach tracks learner progress
# START testing this scenario with a FRESH DB (make a copy of the current if you want to reuse it later), and use the `kolibri manage importusers your-csv-file.csv` command to import a set of users for this case.
# Prepare two browsers, or two windows/tabs of the same browser, one of them being incognito/private mode, in order to sign in into one as a learner user, and as a coach in the other
  
  Background:
    Given that I am signed in as a class or facility coach <coach>
      And there are learners enrolled to the class <class>
      And there is <learner> enrolled in the group <group>
      And there is quiz <quiz> assigned to group <group>

  Scenario: Learner has not started the quiz
    Given have both sessions visible in two browsers/tabs (sign in into one as learner, and in the other as coach)
      When as learner <learner1> in one window I go to the *Learn > Class* page for <class>
      Then I see there's a quiz assigned to me that I have not started
      When as a coach <coach> in another window I go to the *Coach > Reports > Groups > '<group>' > Quizzes assigned > '<quiz>'* detail page
      Then I see the <learner> progress is *Has not started*
        And I see the <learner> score is *-*

  Scenario: Learner has started the quiz
    Given have both sessions visible in two browsers/tabs (sign in into one as learner, and in the other as coach)
      When as learner <learner1> in one window I open the <quiz>
        But I don't do anything else
      Then I see there's a quiz assigned to me that I have not started
      When as a coach <coach> in another window I go to the *Coach > Reports > Groups > '<group>' > Quizzes assigned > '<quiz>'* detail page
      Then I see the <learner> progress is *Has not started*
        And I see the <learner> score is *-*