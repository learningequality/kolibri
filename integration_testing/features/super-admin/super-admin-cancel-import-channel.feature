Feature: Super admin cancels import content
    Super admin needs to be able to cancel import process when importing from either Kolibri Studio or attached drive

  Background:
    Given I am signed in to Kolibri as super admin, or a user with device permissions to import content
      And I am on *Device > Channels* page

  Scenario: Cancel import content channel from Kolibri Studio
    Given the device has Internet connection available
    When I click on *Import* button
    Then I see *Select a source* modal
    When I select *Kolibri Studio* 
      And I click *Continue*
    Then I see the *Loading channels* message
      And I see the *Kolibri Studio* page with the list of available content *Channels*
    When I click *Select* button for the <channel> channel
    Then I see the *Select content from '<channel>'* page
      And I see the list of topics for the <channel> channel
    When I check the <topic> topic checkbox
    Then I see the *Import* button is active 
      And I see the *N resource selected* flag for the <topic> topic
      And I see the values for *Content selected* increase
    When I click the *Import* button
    Then I see *Device > Channels* page again
      And I see the *Importing content...* label and blue progress bar with the percentage increasing
      And I see the *Cancel* button
    When I click the *Cancel* button
    Then I see the *Content* page is reloaded
      And I don't see the content channel whose import has been canceled

  Scenario: Cancel import content channel from attached drive
    Given there is a <drive> local drive attached to the device
    When I click on *Import* button
    Then I see *Select a source* modal
    When I select *Attached drive or memory card* 
      And I click *Continue*
    Then I see Kolibri searching for local drives
      And I see the *Select a drive* modal
    When I select <drive> local drive
      And I click *Continue*
    Then I see the *Import from '<drive>'* page with the list of available content *Channels* on the <drive> local drive
    When I click *Select* button for the <channel> channel
    Then I see the *Select content from '<channel>'* page
      And I see the list of topics for the <channel> channel
    When I check the <topic> topic checkbox
    Then I see the *Import* button is active 
      And I see the *N resource selected* flag for the <topic> topic
      And I see the values for *Content selected* increase
    When I click the *Import* button
    Then I see *Device > Channels* page again
      And I see the *Importing content...* label and blue progress bar with the percentage increasing
      And I see the *Cancel* button
    When I click the *Cancel* button
    Then I see the *Content* page is reloaded
      And I don't see the content channel whose import has been canceled
      
Examples:
| channel      | topic   | drive       |
| MIT Blossoms | Physics | Hard_Disc_1 |