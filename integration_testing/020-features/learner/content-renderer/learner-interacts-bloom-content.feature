Feature: Learner interacts with ploompub and bloomd content
  Learner needs to be able to interact with with ploompub and bloomd content and use all the content reader features

  Background:
    Given I am signed in to Kolibri as a Learner user
      And there is at least one channel imported on the device with ploompub and bloomd content
      And I am on the *Browse channel* page for a channel with ploompub and bloomd content

    Scenario: Learner opens and interacts with a bloompub/bloomd content
      When I click on a bloompub resource card
      Then I see the bloompub viewer
        And I see an *Enter fullscreen* option
        And I see the control icons for ignoring the image descriptions, choosing the language, reading out aloud #the available controls vary depending on the bloompub file
        And I see a slider
        And I see the bloompub content and a right arrow button
      When I click the right arrow button
      Then I see the next page of the bloompub
      When I click the left arrow button
      Then I see the previous page of the bloompub
			When I click the button for full screen
      Then I see the bloompub viewer expands in full screen
      When I click the button to exit full screen or I press the keyboard's Esc key
      Then I see bloompub viewer as before
      When I go through all of the available pages
      Then I see the *Resource completed* modal #repeat the same scenario with a bloomd resource
