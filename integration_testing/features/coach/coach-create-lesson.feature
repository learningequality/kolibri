Feature: Coach creates lessons
  Coach needs to be able to create lessons from existing content

  Background:
    Given I am signed in to Kolibri as a coach user
      And I am on the *Coach > Plan > Lessons* page
      And there is a channel <channel> and topic <topic> on the device

  Scenario: Coach creates a new lesson for entire class
    When I click *New lesson* button
    Then I see the *Create new lesson* modal
    When I fill in the title <title>
     And I fill in the description <description>
      And I click *Continue* button
    Then the modal closes
      And I see the <title> lesson under *Lessons* tab 
    When I click *Manage resources* button
    Then I am on the *Manage resources in '<title>'* page
      And I see the content channel <channel>
    When I select channel <channel>
    Then I see its topics
    When I click the topic <topic>
    Then I see the list of resources in that topic
    When I click on a single resource
    Then I see the preview page for the selected resource
      And I see the *Add* button
    When I click *Add* button
    Then I see the snackbar notification
      And I see the *Added* notification
      And I see the *Remove* button
    When I click on *back arrow* button
    Then I see the *Manage resources in '<title>'* page again
      And I see the *1 resource in this lesson* counter
    When I check the checkbox(es) for other resource(s)
    Then I see the *N resources in this lesson* counter changed
      And I see the snackbar notification
    When I click the *Finish* button at the bottom
    Then *Manage resources in '<title>'* page closes
      And I see the added resources on the <title> lesson page


Examples:
| title         | description  | channel                | topic                |
| First lesson  | Fractions 1  | Khan Academy (English) | Recognize fractions  |
