Feature: Learner engages content channels
  Learner needs to engage with content on Channels tab

  Background:
    Given I am signed in to Kolibri as a Learner user
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
    Then I see the *Channels > '<channel>' > '<topic>' > '<subtopic>' > '<content_item>'* breadcrumb
    When I click on the <content_item> card
    Then I see the <content_item> page
      And I see the video start playing automatically
      # bug in Firefox, issue reported
      And I see the *Next resource* heading and content item under the player
    When video finishes
    Then I see the status icon is yellow star
      And I see the *+500 points* snackbar alert
      And I see the *Next* snackbar alert with the title of the next recommended content item
    When I go back to *Channels > '<channel>' > '<topic>' > '<subtopic>' > '<content_item>'*
    Then I see my points counter is increased by 500 
    When I click on the <topic> or <subtopic> parts of the breadcrumb above the player
    Then I can see the rest of the contents of the <channel>
    When I click on the *Channels* part of the breadcrumb above the player
    Then I can see and browse the rest of the channels on *Learn > Channels* page

Examples:
  | channel        | topic    | subtopic | content_item                     |
  | Kolibri Demo 1 | Science  | Physics  | Intro to springs and Hooke's law |