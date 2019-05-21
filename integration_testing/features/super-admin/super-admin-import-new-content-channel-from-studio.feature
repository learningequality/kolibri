Feature: Super admin imports content from Studio
    Super admin needs to be able to import content channels on the device from Kolibri Studio

  Background:
    Given there is no content from <channel> channel on the device
      And I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on the *Kolibri Studio* page with the list of available content *Channels*

  Scenario: Import new content channel from Kolibri Studio
    When I click *Select* button for the <channel> channel
    Then I see the *Select content from '<channel>'* page
      And I see the list of topics for the <channel> channel
      And I see the total number and size of <channel> channel resources
      And I see the value for *Drive space available*     
      And I see 0 resources from <channel> channel are listed as *On your device*

  Scenario: When I check the *Select all* checkbox
    Then I see the checkboxes for all the topics are checked
      And I see the *Import* button is active
      And I see the values for *Content selected* increase
    When I uncheck the *Select all* checkbox
    Then I see the *Import* button is inactive
      And I see the values for *Content selected* is 0

  Scenario: When I check the <topic> topic checkbox
    Then I see the *Import* button is active
      And I see the values for *Content selected* increase
    When I uncheck the <topic> topic checkbox
    Then I see the *Import* button is inactive
      And I see the values for *Content selected* is 0

  Scenario: When I click the <topic> topic
    Then see the list of subtopics for the <topic> topic
    When I click the <subtopic> subtopic
    Then see the list of resources for the <subtopic> subtopic
    When I check the <resource> resource checkbox
    Then I see the *Import* button is active 
      And I see the *1 resource selected* flag for the <resource> resource
      And I see the values for *Content selected* increase
    When I click the *Import* button
    Then I see *Device > Channels* page again
      And I see the blue progress bar with the percentage increasing 
    When the import process concludes
    Then I see the progress bar at 100%
      And I see the *Finished! Click "Close" button to see changes.* above the progress bar
      And I see the *Close* button
    When I click *Close* 
    Then I see the *Content* page is reloaded 
      And I see the <channel> channel is listed under *Content*
      And I see the size of the <resource> resource I imported

Examples:
| channel      | topic   | subtopic          | resource                   |
| MIT Blossoms | Physics | Forces and Angles | English: Forces and Angles |