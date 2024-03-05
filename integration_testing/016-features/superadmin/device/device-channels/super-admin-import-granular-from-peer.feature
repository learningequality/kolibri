Feature: Super admin imports granular resources from peer
    Super admin needs to be able to import resources granularlly with peer import

    # Use the "Khan Academy (English)" for testing because it takes a long time to load the channel listing.

    # Prepare another device in the LAN with around 15GB of KA EN content, and add it as a peer import address

  Background:
    Given there is no content from <channel> channel on the device
      And I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on *Import from '<local_address>' > Select resources for import* page with the list of available channels

  Scenario: Import resources granularly from a local peer
    When I click *Select resources* button for the <channel> channel
    Then I see the *Importing from "'<local_address>'"* page
    When the channel listing is generated
    Then I see the channel page with logo, name, and version
      And I see the total number and size of <channel> channel resources
      And I see 0 resources from <channel> channel are listed as *On your device*
      And I see the list of topics for the <channel> channel
      And I see the *Import* button is inactive

  Scenario: Select topics or subtopics
    When I check to import the following resources: <topic>, <subtopic1>, <subtopic2>, <subtopic3>, <subtopic4>, <sub-subtopic1>, <sub-subtopic2>, <sub-subtopic3>, <resource1>, <resource2> and <resource3>
    Then I see the *Import* button is active
      And I see the checkboxes for the selected topics, sub-topics and resources are checked
      And I see the total size of resources is 9GB and the total number is 5212

  Scenario: Click the Import button
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

  Scenario: Review imported resources
    Given that the import task is finished
      When I click the *Back to channels* link
      Then I am on *Device > Channels* page
        And I see the <channel> I've imported resources from
        And I see the size of resources that were imported
      When I go to *Learn* page
      Then I can see the <topic>, <subtopic1>, <subtopic2>, <subtopic3>, <subtopic4>, <sub-subtopic1>, <sub-subtopic2>, <sub-subtopic3>, <resource1>, <resource2> and <resource3> correctly
