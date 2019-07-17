Feature: Super admin exports content to local drive
    Super admin needs to be able to export content channels from Kolibri server to local drives

  Background:
    Given there is <channel> content channel on the device
      And I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on *Device > Channels* page

  Scenario: Export content channel to local drive
    Given there is a <drive> local drive attached to the device 
      When I click *Export*
      Then I see Kolibri searching for local drives
        And I see the *Select export destination* modal
      When I select the <drive> local drive
      Then I see the *Continue* button is active
      When I click the *Continue* button
      Then I see the list of channels present on the device
      When I click the *Select* button for the <channel> channel
      Then I see *Select content from…* page
        And I see the list of topics for the <channel> channel
        And I see the total number and size of <channel> channel resources
        And I see the value for *Drive space available*      
        And I see the value for *Content selected* is 0
      # Select/deselect all the topics
      When I check the *Select all* checkbox
      Then I see the checkboxes for all the topics are checked
        And I see the *Export* button is active
        And I see the values for *Content selected* increase
      When I uncheck the *Select all* checkbox
      Then I see the *Export* button is inactive
        And I see the values for *Content selected* is 0
      # Select/deselect one full topic    
      When I check the <topic> topic checkbox
      Then I see the *Export* button is active
        And I see the values for *Content selected* increase
      When I uncheck the <topic> topic checkbox
      Then I see the *Export* button is inactive
        And I see the values for *Content selected* is 0
      # Select and import just one resource from a subtopic of a topic
      When I click the <topic> topic
      Then see the list of subtopics for the <topic> topic
      When I click the <subtopic> subtopic
      Then see the list of resources for the <subtopic> subtopic
      When I check the <resource> resource checkbox
      Then I see the *Export* button is active 
        And I see the *1 resource selected* flag for the <resource> resource
        And I see the values for *Content selected* increase
      When I click the *Export* button
      Then I see *Device > Channels* page again
        And I see the blue progress bar with the percentage increasing 
      When the export process concludes
      Then I see the progress bar at 100%
        And I see the *Finished! Click "Close" button to see changes.* flag
        And I see the *Close* button
      When I click *Close* 
      Then I see the *Content* page is reloaded 
        And I open the <drive> local drive
        And I see the *KOLIBRI_DATA* folder on the <drive> local drive
        And I see the *content* subfolder inside 
        And I see the *databases* and *storage* subfolders inside the *content* folder

    Scenario: No writable drives found
      Given there is no local drive attached to the device
        Or I don't have permissions to write on attached drives
      When I click *Export*
      Then I see Kolibri searching for local drives
        And I see the *Could not find a writable drive connected to the server* notification

Examples:
| drive       | channel      | topic   | subtopic          | resource                   |
| Hard_Disc_1 | MIT Blossoms | Physics | Forces and Angles | English: Forces and Angles |