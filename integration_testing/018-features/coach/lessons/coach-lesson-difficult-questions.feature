Feature: Coach reviews lesson to discover difficult questions
Coach needs to be able to determine which questions in a lesson are difficult

# Prepare two browsers, or two windows/tabs of the same browser, one of them being incognito/private mode, in order to sign in into one as a learner user, and as a coach in the other

  Background:
    Given I have both sessions visible in two browser windows/tabs (signed into one as learner, and in the other as coach)
      And there are <learner1> and <learner2> enrolled in the class
      And there is a <lesson> with <exercise1> and <exercise2> assigned to class <class>

  Scenario: Learner 1 gives an incorrect answer
    When I as <learner1> give an incorrect answer to a question in the exercise
    Then when I as a coach go to *Coach - '<class>' > Lessons > '<lesson>' > Difficult questions* subtab
      And I see the question <question> under the *Question* column
      And I see *1 of 1 needs help* under the *Help needed* column

  Scenario: 2 learners give incorrect answers
    When I as a <learner1> give 1 incorrect answer to question <question> in the <exercise1>
      And I as a <learner2> also give incorrect answer to question <question> in the <exercise1>
    Then I as a coach <coach> go to *Coach - '<class>' > Reports > Lessons > '<lesson>' > Difficult questions* subtab
      And I see the question <question> under the *Question* column
      And I see *2 of 2 need help* under the *Help needed* column

  Scenario: 2 learners give correct answers
    When I as a <learner1> give correct answer to question <question2> in the <exercise2>
      And I as a <learner2> also give correct answer to question <question2> in the <exercise2>
    Then I as a coach <coach> go to *Coach - '<class>' > Reports > Lessons > '<lesson>' > Difficult questions* subtab
      And I don't see any question under the *Question* column
