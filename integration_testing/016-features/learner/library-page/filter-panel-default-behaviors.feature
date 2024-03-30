Feature: Filter panel default behaviors

# Learners should only see filters and filter options for available resources on the device

  Background:
    Given there are channels imported on the device
    	And I am at *Learn > Library*
      And I see the filter panel on the left

  Scenario: Filters are empty by default
    Given I have not started a search
      And there are resources tagged for all available filters
    Then I see the filter fields: *Keywords*, *Categories*, *Activities*, *Language*, *Level*, *Channel*, *Accessibility*, and *Show resources*
      And I see all filter fields are empty

  Scenario: Resources on the device are available for a given filter option
    Given that resources on the devices are tagged with <filter option>
    Then I see only the available filter options in each filter
		When there are no resources tagged for any filter option in a filter
    Then I do not see that filter in the filter panel
