Feature: Super admin imports content from Studio
    Super admin needs to be able to import content channels on the device from Kolibri Studio

    # Use the "Khan Academy (English)" for testing because it takes a long time to load the channel listing.

  Background:
    Given there is no content from <channel> channel on the device
      And I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on the *Kolibri Studio channels > Select resources for import* page with the list of available channels
        Or I am on *Import from '<local_address>' > Select resources for import* page with the list of available channels

  Scenario: Import resources from a new content channel
    When I click *Select resources* button for the <channel> channel
    Then I see the *Kolibri Studio* page
      And I see the "Generating channel listing. This could take a few minutes..." notification
    When the channel listing is generated
    Then I see the channel page with logo, name, and version
      And I see the total number and size of <channel> channel resources   
      And I see 0 resources from <channel> channel are listed as *On your device*
      And I see the list of topics for the <channel> channel
      And I see the *Import* button is inactive

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
    Then I see the list of topics for the channel

  Scenario: Select all topics or subtopics
    When I check the *Select all* checkbox
    Then I see the *Import* button is active
      And I see the checkboxes for all the topics or subtopics are checked
      And I see the *N resources selected* flag for each topic
      And I see the total size and number of resources selected at the bottom 
      And the total equals the sum of resources for each topic 

  Scenario: Deselect a sub-set of subtopics
    Given I am on a subtopic and there are other topics checked outside the current subtopic
      When I uncheck the *Select all* checkbox
      Then I see the *Import* button is still active
        And I see the checkboxes for all the subtopics of the current topic are unchecked
        And I do not see the number of *resources selected* flag for unchecked topics
        And I see the total value of *resources selected* at the bottom has decreased for the number of resources in the unchecked topics

  Scenario: Deselect all topics or subtopics
    Given that no other topics are checked in the topic tree
    When I uncheck the *Select all* checkbox
    Then I see the *Import* button is inactive
      And I see the checkboxes for all the subtopics are unchecked
      And I do not see the number of *resources selected* flag for unchecked topics
      And I see the *0 resources selected* at the bottom

  Scenario: Check a topic or subtopic
    When I check a <topic> topic checkbox
    Then I see the *Import* button is active
      And I see the number of *resources selected* flag for the selected topic checkbox
      And I see the number of *resources selected* at the bottom increase

  Scenario: Uncheck a topic or subtopic
    Given there are two or more topics checked
    When I uncheck a topic checkbox
    Then I see the *Import* button is still active
      And I do not see the number of *resources selected* flag for the unchecked topic
      And I see the number of *resources selected* at the bottom has decreased for the number of resources in the unchecked topics
    
  Scenario: Uncheck the only topic
    Given there is only one topic checked
    When I uncheck the only checked topic checkbox
    Then I see the *Import* button is inactive
      And I do not see the number of *resources selected* flag for the unchecked topic
      And I see the *0 resources selected* at the bottom

  Scenario: Click the Import button
    Given that I have selected at least one topic or subtopic
    When I click the *Import* button
    Then I see *Device > Task manager* page with the current task in progress
      And I see the green progress bar with the percentage increasing 
      And I see *Import resources from '<channel>'* 
      And I see the number and size of the resources being imported
      And I see the *Cancel* button
    When the import process concludes
    Then I see the task is labeled as *Finished*
      And I do not see the progress bar anymore
      And I see the *Clear* button for the finished task
      And I see the *Clear completed* button
      
  Scenario: Click the *Clear* button
    Given that there are one or more finished import tasks
      When I click the *Clear* button for one finished task
      Then I don't see it on the *Task* list
      
  Scenario: Click the *Clear completed* button
    Given that there are one or more finished import tasks
      When I click the *Clear completed* button
      Then I see the *There are no tasks to display* notification 

  Scenario: Review imported resources
    Given that there are one or more finished import tasks
      When I click the *Back to channels* link
      Then I am on *Device > Channels* page
        And I see the <channel> I've imported resources from
        And I see the size of resources that were imported

Examples:
| channel      | topic   | subtopic          | resource                   |
| MIT Blossoms | Physics | Forces and Angles | English: Forces and Angles |
