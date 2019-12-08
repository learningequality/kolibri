Feature: Coach tracks learner progress in a quiz

# Prepare two browsers, or two windows/tabs of the same browser, one of them being incognito/private mode, in order to sign into one as a learner user, and as a coach in the other
  
  Background:
    Given I have both sessions visible in two browser windows/tabs (signed into one as learner, and in the other as coach)
      And there is <learner> enrolled into the class <class>
      And there is an active lesson <lesson> assigned to class <class> with one <exercise>

  Scenario: Learner starts the exercise   
    When as learner <learner> in one window I go to the *Learn > Class* page for <class>
    Then I see there's a lesson <lesson> assigned to me that I have not started
    When I click to start the lesson
    Then as a coach <coach> in another window I see the *'<learner>' has started '<exercise>'* notification in the *Coach - '<class>' > Class home > Class activity* block
      And I also see the *'<learner>' has started '<lesson>' notification in the *Class activity* block

  Scenario: Coach gets notification that learner needs help with an exercise
    When as learner <learner> I intentionally make 2 incorrect answers to a question
    Then within 5 seconds as a coach <coach> in another window I see the *'<learner>' needs help with '<exercise>'* notification in the *Coach - '<class>' > Class home > Class activity* block
    When I as a coach I click on the notification
    Then I see the <exercise> detail page for <learner>
      And I see the 3 red X buttons for the 3 incorrect answers to the question
    When I click on each red X button
    Then I below see the exact incorrect answer given as <learner>
    When I check the *Show correct answer*
    Then I see the correct answer
      And I don't see the red X buttons
