Feature: Coach review of class report per channel
  Coach needs to be able to review progress of the complete class for a particular channel in Kolibri

  ### Is this still valid in 0.12?

  Background:
    Given I am signed in to Kolibri as a facility coach
      And there is a class <class>
      And there is a channel <channel> learners from class <class> have interacted with

  Scenario: Review progress of the whole class for a channel
    When I open the sidebar
      And click on *Coach*
    Then I see a list of classes in the facility
    When I click on the class <class>
    Then I see the *Learner reports* for class <class> on *Coach > Learners* page
    When I click the *Channels* tab
    Then I am on *Coach > Channels* page
      And I see the *Classes > '<class>' > Channels* breadcrumb
      And I see all the channels available on the device
    When I click the channel <channel>
    Then I see the *Classes > '<class>' > Channels > '<channel>'* breadcrumb
      And I see all the topics for the channel <channel>
      And I see *Avg. exercises progress* and *Avg. resource progress* columns with progress bars for each topic
    When I click the topic <topic>
    Then I see the *Classes > '<class>' > Channels > '<channel>' > '<topic>'* breadcrumb
      And I see all the subtopics of the <topic> topic for the channel <channel>
      And I see *Avg. exercises progress* and *Avg. resource progress* columns with progress bars for each subtopic
    When I click the subtopic <subtopic>
    Then I see the *Classes > '<class>' > Channels > '<channel>' > '<topic>' > '<subtopic>'* breadcrumb
      And I see all the content items of the subtopic <subtopic> of the <topic> topic for the channel <channel>
      And I see *Avg. exercises progress* progress bar(s) for the excercise content items
      And I see *Avg. resource progress* progress bar(s) for the resource content items
    When I click the <content_item> content item
    Then I see the *Classes > '<class>' > Channels > '<channel>' > '<topic>' > '<subtopic>' > '<content_item>'* breadcrumb
      And I see the full list of learners with their progress
      But I cannot click the individual learners

Examples:
| class     | channel        | topic    | subtopic | content_item                     |
| Buffoons  | Kolibri Demo 1 | Science  | Physics  | Intro to springs and Hooke's law |
