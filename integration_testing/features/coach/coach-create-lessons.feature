Feature: Coach create lessons
    Coach need to be able to create lessons from existing content

  Background:
    Given I am signed in to Kolibri as a coach user
    Given I am on the *Coach > Lessons* page
    Given there is a channel <channel> and topic <topic> that contains exercises

  Scenario: Coach create a new lesson to the class
    When I click *New lesson* button
    Then the *New lesson* modal was appears
    When I fill in the title <title>
    When I fill in the description <description>
    When I click *Continue* button
    Then I am on the *Lesson* page that I created
    When I click *Add resources* button
    Then I am on the *Select resources* page
    And I see the existing content channel <channel>
    When I select channel <channel>
    Then I see lots' of topic
    When I click the topic <topic>
    Then I am on *Preview resources* page
    And I see all questionnaire
    When I click *Back arrow symbol* button
    Then I am back to *Select resources* page with path location that I opened
    When I check one topic <topic>
    When I click *Save* button
    Then I see changes to lesson saved
    And the topic was added to resources


Examples:
| title           | description                 | channel                | topic                |
| Examples title  | Example description         | Khan academy (English) | Recognize fractions  |
