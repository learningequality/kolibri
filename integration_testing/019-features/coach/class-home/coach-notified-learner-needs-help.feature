Feature: Coach is notified that a learner needs help

  Background:
    Given I am signed in to Kolibri as a class coach
      And as a coach I have assigned a lesson with an exercise to the entire class and started it
      And there are learners enrolled in the class
      And in a different browser I am signed in to Kolibri as a learner #or using a browser tab in incognito mode

  Scenario: Coach gets notification that learner needs help with an exercise
    When as learner I intentionally give 4 consecutive incorrect answers to a question
    Then within 5 seconds as a coach I see the *'<learner>' needs help with '<exercise>'* notification in the *Coach - '<class>' > Class home > Class activity* section
    When as a coach I click on the notification
    Then I see the exercise's detail page for the learner
      And I see the 4 red X buttons for the 4 incorrect attempts to answer the question
    When I click on each red X button
    Then I see the exact incorrect answer given by the learner
    When I check the *Show correct answer* checkbox
    Then I see the correct answer
      And I don't see the red X buttons
