Feature: Facility admin device management
  Facility admins with device permissions need to see the *Device* dashboard to be able to manage resources

  Background:
    Given I am signed into Kolibri as a facility admin user with device permissions for content import

  Scenario: View all the options for managing content
    When I go to *Device > Channels* page
    Then I see the list of already imported channels
      And I see the *Options* button for each channel
      And I see the *Import* and *Export* buttons
    When I click the *Options* button
      And I select *Import more*
    Then I see the *Select a source* modal
      And I can select one of the options

      # Continue testing content management by using the scenarios for super admins
