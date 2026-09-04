Feature: Search for resources on the device

  Background:
    Given there are imported channels on the device
    When I go to the *Library* tab
      And I see the filter panel on the left
      And there are filter options available for each filter

  Scenario: Behavior of other filter fields relative to a selected filter option
    When I select an option from a filter
    Then I see the available search results for the selected filter option
      And I see that the filter option is selected in the filter panel
      And I see *N results for <filter option>*
      And I see some or all of the other filters disabled if they are no longer applicable

  Scenario: Search by keyword
    When I enter a keyword in *Find something to learn*
    	And I click the search button #or press the keyboard's Enter key
    Then I see the available search results for the keyword
      And I see a chip for the keyword above the search results

  Scenario: Clearing keyword field text does not clear search results
    Given I am viewing the search results for a keyword
    When I click the *X* in the keyword field
    Then I do not see text in the keyword field
      And I see that the search results for the keyword have not cleared
      And I see that the search button for the keyword field is disabled

  Scenario: Filter by a category
    When I click on a category from the *Categories* section
    Then I see the *Choose a category* modal
      And I see a list of sub-categories that are tagged on my device
    When I click on a sub-category
    Then the modal closes
      And I see the available search results for resources in that sub-category
      And I see that the category is selected in the panel
      And I see a chip for the sub-category above the search results #repeat for testing with multiple categories

  Scenario: Select *Uncategorized* from the Categories filter
    When I click *Uncategorized* under *Categories*
    Then I see that *Uncategorized* is selected
      And I see the available search results for *Uncategorized*
      And I see a chip that says *Uncategorized* above the search results
      And I see all resources that have not been tagged with any category

  Scenario: Filter by activity
    When I click on an activity
    Then I see that the activity is selected in the filter panel
      And I see the available search results for the selected activity
      And I see a chip for the activity above the search results

  Scenario: Filter by language
    When I click the language drop-down
    Then I only see languages for resources which are available on my device
    When I select a language
    Then I see the selected language displayed in the filter panel
      And I see the available search results for the selected language
      And I see a chip for the selected language above the search results

  Scenario: Filter by level
    When I select a level
    Then I see the selected level displayed in the filter panel
      And I see the available search results for the selected level
      And I see a chip for the selected level above the search results

  Scenario: Filter by accessibility
    When I select an accessibility option
    Then I see the selected accessibility option displayed in the filter panel
      And I see the available search results for the selected accessibility option
      And I see a chip for the selected accessibility option above the search results

  Scenario: Filter by the options in *Show resources*
    When I select a checkbox option under *Show resources*
    Then I see the available search results for the selected option
      And I see a chip for the checkbox option above the search results
