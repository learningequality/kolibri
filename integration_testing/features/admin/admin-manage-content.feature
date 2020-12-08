Feature: Facility admin device management
  Facility admins with device permissions need to see the *Device* dashboard to be able to manage resources

  Background:
    Given The user is signed into Kolibri as a facility admin user with device permissions for content import

  Scenario: View all the options for managing content
    When The user goes to *Device > Channels* page
    Then The user sees the list of already imported channels
      And The user sees the *Options* button for each channel
      And The user sees the *Import* and *Export* buttons
    When The user clicks the *Options* button
      And The user selects *Import more*
    Then The user sees the *Select a source* modal
      And The user can select one of the options

      # Continue testing content management by using the scenarios for super admins
