Feature: Coach create lessons
  Coach need to be able to create lessons from existing content

  Background:
    Given I am signed in to Kolibri as a coach user
      And I am on the *Coach > Lessons* page
      And there is a channel <channel> and topic <topic> on the device

  Scenario: Coach creates a new lesson for entire class
    When I click *New lesson* button
    Then I see the *Create new lesson* modal
    When I fill in the title <title>
     And I fill in the description <description>
      And I click *Continue* button
    Then the modal closes
      And I am on the <title> lesson page
    When I click *Manage resources* button
    Then I am on the *Select resources* page
      And I see the content channel <channel>
    When I select channel <channel>
    Then I see its topics
    When I click the topic <topic>
    Then I see the list of resources in that topic
    When I click on a single resource
    Then I see the *Preview resource* page
    When I click on *back arrow* button
    Then I see the *Select resources* page again
    When I check the resource(s) checkbox
    Then I see the *Total resources selected* count changed
    When I click the *Exit (X)* button on the *Manage resources* header
    Then *Select resources* page closes
      And I see the added resources on the <title> lesson page


Examples:
| title         | description  | channel                | topic                |
| First lesson  | Fractions 1  | Khan Academy (English) | Recognize fractions  |
