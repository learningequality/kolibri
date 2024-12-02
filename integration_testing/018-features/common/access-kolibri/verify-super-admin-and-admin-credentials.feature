Feature: Verify 'Super admin' and 'Admin' credentials

  Background:
    Given That I have an existing Super admin and admin account
      And I signed-in as 'Super admin' user
      And I open a New incognito window
      And I signed-in as 'Admin' user
    Then I have two Browser windows active

    Scenario: 'Super admin' and 'Admin' account *Coach* page access
        When I use the Browser windows with the 'Super admin' account
          And I open the sidebar from the top left icon
        Then I see the *Coach* menu option
        When I click the *Coach* button
        Then I am at the *Coach* page
        When I use the Browser windows with the 'Admin' account
          And I open the sidebar from the top left icon
        Then I see the *Coach* menu option
        When I click the *Coach* button
        Then I am at the *Coach* page

    Scenario: 'Super admin' and 'Admin' account *Facility* page access
        When I use the Browser windows with the 'Super admin' account
          And I open the sidebar from the top left icon
        Then I see the *Facility* menu option
        When I click the *Facility*
        Then I am at the *Facility* page
        When I use the Browser windows with the 'Admin' account
          And I open the sidebar from the top left icon
        Then I see the *Facility* menu option
        When I click the *Facility* button
        Then I am at the *Facility > Classes* page

    Scenario: 'Super admin' and 'Admin' account *Device* page access
        When I use the Browser windows with the 'Super admin' account
          And I open the sidebar from the top left icon
        Then I see the *Device* menu option
        When I click the *Device* button
        Then I am at the *Device > Content* page
        When I use the Browser windows with the 'Admin' account
          And I open the sidebar from the top left icon
        Then I did not see the *Device* menu option
