Feature: Facility admin device management
  Facility admins with device permissions need to see the *Device* dashboard to be able to manage resources

  Background:
    Given I am signed into Kolibri as a facility admin user with device permissions for content import
    	And there are imported channels on the device

  Scenario: View all the options for managing content
    When I go to the *Device > Channels* page
    Then I see the *Channels* label
    	And I see the *Options* drop-down and the *Import* button to the right
    	And I see the list with already imported channels
      And I see the *Manage* button for each channel
    When I click the *Manage* button for a channel
    Then I see the *Manage <channel>* modal
    	And I see all the available channel details
    	And I see all the imported channel resources
    	And I see an *Import more* button
    	And I see that the *Delete* and *Export* buttons are disabled

    # Continue testing content management by using the scenarios for super admins
