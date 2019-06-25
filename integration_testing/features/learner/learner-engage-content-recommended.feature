Feature: Learner engages recommended content
  Learner needs to engage with content in the Recommended tab

  Background:
    Given I am signed in to Kolibri as a learner user
      And there is one or more channels imported on the device
      And I am on *Learn > Recommended* page

  Scenario: Engage with content on Recommended tab
    When I see content items under the *Most popular*, *Next steps* and *Resume* headings
    Then I can use the right arrow buttons to see more in each section
      And after that I can use the left arrow buttons to browse back
    When I click the <content_item> content item
    Then I see the *Recommended > '<content_item>'* breadcrumb
      And I see the video start playing automatically
      And below the player I see other *Recommended* items
    When video finishes
    Then I see the *Next resource* heading and content item under the player
      And I see the *Next* snackbar alert with the title of the next recommended content item
      And I see the *+500 points* snackbar alert
      And I see my points counter is increased by 500
    When I click on *Recommended* in the breadcrumb above the player
    Then I see the *Learn > Recommended* page

Examples:
  | channel      | content_item                     |
  | Khan Academy | Intro to springs and Hooke's law |
