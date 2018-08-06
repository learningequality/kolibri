Feature: Superuser select import content location
    Superuser needs to be able to select where to import content from: Kolibri Studio or attached drive 

  Background:
    Given I am signed in to Kolibri as superuser, or a user with device permissions to import content
      And I am on *Device > Content* page

  Scenario: Import content channels from Kolibri Studio
    Given the device has Internet connection available
    When I click on *Import* button
    Then I see *Import from* modal
    When I select *Kolibri Studio* 
      And I click *Continue*
    Then I see the *Kolibri Studio* page with the list of available content *Channels*

  Scenario: Import content channels from attached drive
    Given there is a <drive> local drive attached to the device
    When I click on *Import* button
    Then I see *Import from* modal
    When I select *Attached drive or memory card* 
      And I click *Continue*
    Then I see Kolibri searching for local drives
      And I see the *Select a drive modal
    When I select <drive> local drive
      And I click *Continue*
    Then I see the *Import from '<drive>'* page with the list of available content *Channels* on the <drive> local drive

Examples:
| drive       |
| Hard_Disc_1 |
| USB_Card_2  |