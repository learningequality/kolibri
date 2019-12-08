Feature: Guest engages recommended content
  Guest needs to engage with content on Recommended tab

  Background:
    Given I am on Kolibri sign in page
      And I click *Explore without account* button
      And there is one or more channels imported on the device
      And I am on *Learn > Recommended* page

  Scenario: Engage with content on Recommended tab
  	When I see two or more content items under the *Most popular* heading
  	Then I can use the right arrow button to see more
      And after that I can use the left arrow button to browse back
  	When I click the <content_item> content item
  	Then I see the *Recommended > '<content_item>'* page
      And I see the video start playing automatically
    When video finishes
    Then I see the *Next resource* heading and content item under the player
      And I see the *500 points* snackbar alert, suggesting I sign up in order to accumulate points
      And I see the *Next* snackbar alert with the title of the next recommended content item
    When I click the back button before *Recommended* above the player
    Then I see the *Learn > Recommended* page

Examples:
  | channel      | content_item                     |
  | Khan Academy | Intro to springs and Hooke's law |