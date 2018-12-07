Feature: Admin import content
  Admin who has been granted the device permissions needs to be able to import content channels on the device

  Background:
    Given I am signed in to Kolibri as admin user
      And I have been granted the device permissions to import content

  Scenario: Admin imports content channels
    When I open the sidebar
    Then I can click on *Device*
      And I see the *Device > Channels* page
      And I can click on *Import* button and select channels to import
