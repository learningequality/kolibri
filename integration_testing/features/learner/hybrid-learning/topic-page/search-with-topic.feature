Feature: Search with topic

  Background:
    Given there is at least one channel loaded to the device
    When I go to the *Library* tab
      And I click one of the channel cards displayed at the top of the default page
      And I see the Topics page open

# Search with a single filter

  Scenario: Behavior of other filter fields relative to a selected filter option
    Given I have not started a search
      And all filter fields are empty
    When I select <filter option> in <filter field>
    Then I see search results for <filter option>
      And I see <filter option> is selected in the filter panel
      And I see all other filter fields are set to *All*

#######
# due to difficulties with calculating these possibilities, this will have to be modified/removed as a criterion
      And I see that filter options which would return 0 results in combination with the selected <filter option> are disabled
      And I see that filter fields that would return 0 results for all filter options in combination with the selected <filter option> are disabled
#######


  Scenario: Search by keyword by using search button
    When I click the keyword field
    When I enter <keyword>
    When I click the search button
    Then I see search results for <keyword>
      And I see a chip for <keyword> above the search results

  Scenario: Search by keyword by using enter key
    When I click the keyword field
    When I enter <keyword>
    When I press the enter key
    Then I see search results for <keyword>
      And I see a chip for <keyword> above the search results

  Scenario: Clearing keyword field text does not clear search results
    Given I am viewing search results for <keyword>
    When I click the *X* in the keyword field
    Then I do not see text in the keyword field
      And I see that the search results for <keyword> have not cleared
      And I see that the search button for the keyword field is disabled

  Scenario: Select a category
    When I click <category>
    Then I see *Choose a category* modal
      And I see a list of sub-categories that are tagged on my device
      And I do not see sub-categories
    When I click <sub-category>
    Then I see the modal close
      And I see search results for resources in <sub-category>
      And I see <category> is selected in the panel
      And I see a chip for <sub-category> above the search results

  # I think this can be removed? I'm not sure where this fits in (MM)
  Scenario: Select "All categories" in a category modal
    When I click <category> in *Categories*
    When I click *All categories* in the *Choose a category* modal for <category>
    Then I see search results for "<category> - All categories"
      And I see a chip that says "<category> - All categories" above the search results

  Scenario: Select "All categories" from the Category filter
    When I click *All categories* under *Categories*
    Then I see *All categories* is selected
      And I see search results for *All categories*
      And I see a chip that says *All categories* above the search results
      And I see all resources that have been tagged with some category

  Scenario: Select "None of the above" from the Category filter
    When I click *None of the above* under *Categories*
    Then I see *None of the above* is selected
      And I see search results for *None of the above*
      And I see a chip that says "None of the above" above the search results
      And I see all resources that have not been tagged with any category

  Scenario: Select activity
    When I select <activity>
    Then I see <activity> is selected in the filter panel
      And I see search results for <activity>
      And I see a chip for <activity> above the search results

  Scenario: Select level
    When I select <level>
    Then I see <level> is selected in the filter panel
      And I see search results for <level>
      And I see a chip for <level> above the search results

  Scenario: Select language
    When I open the language filter
    Then I only see languages that are available on my device
    When I select <language>
    Then I see <language> is selected in the filter panel
      And I see search results for <language>
      And I see a chip for <language> above the search results

  Scenario: Select channel
    When I select <channel>
    Then I see <channel> is selected in the filter panel
      And I see search results for <channel>
      And I see a chip for <channel> above the search results

  Scenario: Select accessibility option
    When I click <accessibility option>
    Then I see <accessibility option> is selected in the filter panel
      And I see search results for <accessibility option>
      And I see a chip for <accessibility option> above the search results

  Scenario: Select "Show resources" option
    When I select <checkbox option> under "Show resources"
    Then I see <checkbox option> is selected in the filter panel
      And I see search results with resources tagged with <checkbox option>
      And I see a chip for <checkbox option> above the search results
