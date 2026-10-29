Feature: Super admin can filter and search for users at Device > Permissions
  When there is more than one facility on the device, a super admin needs to be able to filter the users by facility and role from all facilities in the Device > Permissions users table.

  Background:
    Given I am signed in as a super admin
    	And there is only one facility on the device
    	And there are created users of all types

  Scenario: Super admin can see the Device permissions user table when there is only one facility on the device
    When I go to the *Device > Permissions* page
    Then I see the *Permissions* and *User type* filters
    	And the default value of each filter is *All*
      And I see a *Search for a user* field
      And I see the users table with a *Full name* and a *Username* columns
      And I see all of the available users
      And I see a *View permissions* or an *Edit permissions* option for each user

  Scenario: Super admin can see the Device permissions user table when there are multiple facilities on the device
  	Given there are multiple facilities on the device
  		And in each facility there are users of all types
    When I go to the *Device > Permissions* page
    Then I see the *Permissions*, *User type* and *Facility* filters
    	And the default value of each filter is *All*
      And I see a *Search for a user* field
      And I see the users table with a *Full name*, *Username* and *Facility* columns
      And I see all of the available users
      And I see a *View permissions* or an *Edit permissions* option for each user

  Scenario: Filter by each or combination of the available filters
    Given there are multiple facilities on the device
  		And in each facility there are users of all types
    When I click on a filter
    	And I select a value from the filter
    Then I see only results matching the applied filter
    When there are no results matching the applied filter
    Then I see a *No users match the selected filter* message
    When I apply a combination of filters
    Then I see only results matching the applied filters
    When there are no results matching the applied filters
    Then I see a *No users match the selected filters* message

  Scenario: Search for a user
  	Given there are multiple facilities on the device
  		And in each facility there are users of all types
  	When I enter the name or the username of a user in the *Search for a user* field
  	Then I see only results matching the entered keyword
  	When there are no results matching the entered keyword
  	Then I see a *No users match the selected filters* message
  	When I click the *X* icon next to the entered keyword
  	Then the keyword is cleared
  		And I see the default state of the table with all of the available users
