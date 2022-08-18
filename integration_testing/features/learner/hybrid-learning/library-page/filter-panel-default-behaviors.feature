Feature: Filter panel default behaviors

# Users should only see filters and filter options for available resources on the device

  Background:
    Given there are channels imported on the device
    When I go to the *Library* tab
      And I see the filter panel on the left

  Scenario: Filters are empty by default
    Given I have not started a search
      And there are resources tagged for all available filters
    Then I see the filter fields: *Keywords*, *Categories*, *Activities*, *Level*, *Language*, *Channel*, *Accessibility*, and *Show resources*
      And I see all filter fields are empty

  Scenario: Resources on the device are available for a given filter option
    Given that resources on the devices are tagged with <filter option>
    Then I see <filter option> in <filter>

  Scenario: Hide filter options that are not available
    Given there are no resources tagged with <filter option 1> in <filter>
      And there are some resources tagged with <filter option 2> in <filter>
    Then I do not see <filter option 1> in <filter>
      And I see <filter option 2> in <filter>

  Scenario: Hide entire filter fields that are not available on the device
    Given there are no resources tagged for any filter option in <filter>
    Then I do not see <filter> in the filter panel
