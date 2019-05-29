Feature: Super admin imports content from Studio
    Super admin needs to be able to import content channels on the device from Kolibri Studio
    # The contents for the channels are shown as a tree of topics/subtopics with resources inside.
    # Use the "Khan Academy (English)" for testing because it takes a long time to load the channel listing.

  Background:
    Given there is no content from <channel> channel on the device
      And I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on the *Kolibri Studio* page with the list of available content *Channels*

  Scenario: Import new content channel from Kolibri Studio
    When I click *Select* button for the <channel> channel
    Then I see the *Select content from '<channel>'* page
      And I see the "Generating channel listing. This could take a few minutes..." text
      And I see the *Cancel* button
    When the channel listing is generated
    Then I see the channel page with logo, name, and version
      And I see the total number and size of <channel> channel resources
      And I see the value for *Drive space available*     
      And I see 0 resources from <channel> channel are listed as *On your device*
      And I see the list of topics for the <channel> channel

  Scenario: Navigate the topic tree
    When I click the <topic> topic link
    Then I see the list of subtopics for the <topic> topic
      And I see the channel name as a breadcrumb link
      And I see the topic name as a breadcrumb next to the channel name
    When I click the <subtopic> subtopic link
    Then I see the list of subtopics for the <subtopic> subtopic
      And I see the subtopic name as a link
      And I see the subtopic name as a breadcrumb next to the topic name
    When I click the topic name link in the breadcrumb
    Then I see the topic tree page
    When I click the channel name link
    Then I see the *Select content from '<channel>'* page

  Scenario: Select all topics or subtopics
    When I check the *Select all* checkbox
    Then I see the checkboxes for all the topics or subtopics are checked
      And I see the *Import* button is active
      And I see the number of *resources selected* flag for each topic checkbox
      And I see the sum of size and number of resources selected in the *Content selected*

  Scenario: Unselect all topics or subtopics
    When I uncheck the *Select all* checkbox
    Then I see the checkboxes for all the topics or subtopics are unchecked
      And I do not see the number of *resources selected* flag for unchecked topics
    Given there are other topics checked in the topic tree
    Then I see the *Import* button is still active
      And I see the values for *Content selected* is deducted with the values from the unchecked topics
    Given that no other topics are checked in the topic tree
    Then I see the *Import* button is inactive
      And I see the values for *Content selected* is 0

  Scenario: Check a topic or subtopic
    When I check a <topic> topic checkbox
    Then I see the *Import* button is active
      And I see the number of *resources selected* flag for the selected topic checkbox
      And I see the values for *Content selected* increase

  Scenario: Uncheck a topic or subtopic
    When I uncheck a topic checkbox
    Then I do not see the number of *resources selected* flag for the unchecked topic
    Given there is another topic checked
    Then I see the *Import* button is still active
      And I see the values for *Content selected* is deducted with the values from the unchecked topic
    Given it is the only topic checked
    Then I see the *Import* button is inactive
      And I see the values for *Content selected* is 0

  Scenario: Click the Import button
    Given that I have selected at least one topic or subtopic
    When I click the *Import* button
    Then I see *Device > Channels* page again
      And I see the blue progress bar with the percentage increasing 
      And I see the *Cancel* button
    When the import process concludes
    Then I see the *Finished! Click "Close" button to see changes.*
      And I see the *Close* button
      But I should not see the progress bar anymore

  Scenario: Click the Close button
    Given that the import process have just concluded
    When I click the *Close* button
    Then I see the *Content* page is reloaded 
      And I see the <channel> channel is listed under *Content*
      And I see the size of the <resource> resource I imported

Examples:
| channel      | topic   | subtopic          | resource                   |
| MIT Blossoms | Physics | Forces and Angles | English: Forces and Angles |
