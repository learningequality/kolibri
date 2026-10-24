Feature: Search for resources on the device

  Background:
    Given there are imported channels on the device
    	And I am at *Learn > Library*
      And I see the filter options under the *Find something to learn* field
      And there are filter options available for each filter

  Scenario: Search for a channel, folder or resource by entering a keyword
    When I enter a keyword in *Find something to learn*
    	And I click the search button #or press the keyboard's Enter key
    Then I see the available search results for the keyword
      And I see a pill button for the keyword above the search results
		When I click the *X* icon of the keyword field
    Then the entered keyword is cleared
      And I see that the search results for the keyword are also cleared
      And I see that the search button for the keyword field is disabled

  Scenario: Search for resources by applying any of the available filters
		When I click the *All filters >* pill button
		Then I see the *All filters* side panel
			And I see options to filter by activity, category, language, level, accessibility and mastery level
		When I select a value from any of the available filters
		Then the page refreshes in the background showing only the matching search results for the selected filter option
      And I see that the filter option marked as selected in the filter panel
      And I see some or all of the other filters disabled if they are no longer applicable
    When I close the *All filters* side panel
		Then I see only the search results matching the applied filter(s)
			And I see pill buttons for each of the applied filters under the *Find something to learn* field
			And I see a *Clear all* label to the right
			And I see the number of results as *N result(s)*
