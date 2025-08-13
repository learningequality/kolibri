Feature: Toggle user filters in Device > Permissions
  When there is more than one facility on the device, a super admin needs to be able to filter the users by facility and role from all facilities in the Device > Permissions users table.

  Background:
    Given I am signed in as a super admin
    And I am on *Device > Permissions* page

  Scenario: Permissions user table when there is more than one facility on the device
    Given there is more than one facility on the device
      And I see a *User type* filter
      And I see a *Permission* dropdown filter
      And I see a *Facility* dropdown filter
      And I see a *Facility* column

  Scenario: Permissions user table when there is only one facility on the device
    Given there is only one facility on the device
      And I see the *User type* filter
      And I see a text filter
      And I do not see a *Permission* dropdown filter
      And I do not see a *Facility* dropdown filter
      And I do not see a *Facility column*

  Scenario: Filter by facility
    Given there is more than one facility on the device
      And I see the *Facility* dropdown filter
    When I click the *Facility* dropdown filter
    Then I see a list of facilities on the device
      And I see *All*
    When I select a <facility>
    Then I only see users of the <facility> in the users table

  Scenario: Filter by user type
    Given there is more than one facility on the device
    When I click the *User type* filter
    Then I see *All*, *Learners*, *Coaches*, and *Admins* as options to select
      But I do not see *Super admins*
    When I select *Admins*
    Then I only see users who are *Admins*
    When I click the *User type* filter
      And I click *All*
    Then I see all users in all facilities

  Scenario: Filter by user type
    Given there is more than one facility on the device
    When I click the *Permission* filter
    Then I see *All*, *Can manage content*, *Super admin*, and *No device permission* as options
    When I select *Can manage content*
    Then I only see users who have the permission *Can manage content*
      And I also see super admin users
    When I click the *Permission* dropdown
      And I click *All*
    Then I see all users in all facilities

  Scenario: Filter with multiple filters at once
    Given there is more than one facility on the device
    # Filters should function as AND operations
    When I select the *Permission* dropdown
      And I select *Can manage content*
    Then I only see users who have the permission *Can manage content*
      And I also see super admin users
    When I click the *User type* filter
      And I select *Admin*
    Then I see users who have both the permission *Can manage content* and are *Admin* users in all facilities
