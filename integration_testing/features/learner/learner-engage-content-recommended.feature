Feature: Learner engages recommended content
  Learner needs to engage with content in the Recommended tab

  Background:
    Given I am signed in to Kolibri as a learner user
      And there is one or more channels imported on the device
      And I am on *Learn > Recommended* page

  Scenario: Engage with content on Recommended tab
    When I see content items under the *Most popular* and *Recommended* headings
    # *Next steps* and *Resume* ???
    Then I can use the right arrow buttons to see more in each section
      And after that I can use the left arrow buttons to browse back
    When I click the <content_item> content item
    Then I see the *Recommended > '<content_item>'* page
      And I see the video start playing automatically
    #  And below the player I see other *Recommended* items
      And I see the *Next resource* heading and content item under the player
    When video finishes
      And I go back to *Learn > Recommended* page
    #  And I see the *Next* snackbar alert with the title of the next recommended content item
     # And I see the *+500 points* snackbar alert
    Then I see my points counter is increased by 500

Examples:
  | channel      | content_item                     |
  | Khan Academy | Intro to springs and Hooke's law |
