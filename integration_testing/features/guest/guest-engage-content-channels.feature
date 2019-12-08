Feature: Guest engages content channels
  Guest needs to engage with content on Channels tab

  Background:
    Given I am on Kolibri sign in page
      And I click *Continue as guest* button
      And there is one or more channels imported on the device
      And I am on *Learn > Channels* page

  Scenario: Engage with content on Channels tab
    When I click the channel <channel>
    Then I see the *Channels > '<channel>'* breadcrumb
      And I see all the topics for the channel <channel>
    When I click the topic <topic>
    Then I see the *Channels > '<channel>' > '<topic>'* breadcrumb
      And I see all the subtopics of the <topic> topic for the channel <channel>
    When I click the subtopic <subtopic>
    Then I see the *Channels > '<channel>' > '<topic>' > '<subtopic>'* breadcrumb
      And I see all the content items of the subtopic <subtopic> of the <topic> topic for the channel <channel>
    When I click the <content_item> content item
    Then I see the *'<subtopic>' > '<content_item>'* page
      And I see the video start playing automatically
      And I see the *Next resource* heading and content item under the player
    When video finishes
    Then I see the *500 points* snackbar alert, suggesting I sign up in order to accumulate points
      And I see the *Next* snackbar alert with the title of the next recommended content item
    When I click back button before the <topic> above the player
    Then I see the *'<subtopic>' > '<content_item>'* page

Examples:
  | channel        | topic    | subtopic | content_item                     |
  | Kolibri Demo 1 | Science  | Physics  | Intro to springs and Hooke's law |



