Feature: Admin can rearrange channels
  Admins need to be able to customize the order in which the channels are displayed for Learners and Coaches

  Background:
    Given I am signed in as an Admin or other user with content management permissions
    And I am at the *Device > Channels* page

  Scenario: User can move a channel
    When I click the *Options drop-down*
    	And I select the *Edit channel order* option
    Then I see the *Edit channel order* modal
    When I drag a channel using my mouse or keyboard to a new position
    Then I see a *Channel order saved* snackbar notification
    When I close the modal
    Then I am back at the *Device > Channels* page
    	And I can see that the order of the channels is changes as intended

  Scenario: The new channel order is reflected in all parts of the app
    Given I've already reordered the channels
    When I navigate to any of the following locations: *Device > Channels > Export channels*, *Device > Channels > Delete channels*, *Coach > Create new quiz*, *Coach > Manage lesson resources*, *Learn > Home > Explore channels* and *Learn > Library*
    Then I see that the channels are ordered as intended
