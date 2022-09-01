Feature: Search results

  Background:
    Given there are imported channels on my device
      And I am on the *Library* tab
      And I've initiated a search with applied filters
      And I am viewing the search results page

  Scenario: View a resource and go back to the search results
  	When I click on a resource card
  	Then I can see and interact with the resource
  	When I click the *Go back* arrow
  	Then I am back at the search results page
  		And I can see all the previously selected filters
  		And I can see all of the previously returned search results

  Scenario: Clear one filter (MM)
    When I remove a chip for <filter option> in <filter field> above the search results
    Then I see the chip for <filter option> is removed from the header
      And I see search results matching <filter option> are no longer included
      And I see <filter option> is no longer selected in the filter panel

  Scenario: Clear all filters (MM)
    When I click *Clear All* for <filter options> chips above the search results
    Then I see the default *Library* tab
      And I see search results matching <filter options> are no longer included
      And I see the chips for <filter options> are removed from the header
      And I see <filter option> is no longer selected in the filter panel

  Scenario: Toggle list and grid view (MM)
    When I click the *List Icon* in the right corner of the main content grid
      And I see the "View as list" tooltip on hover over the icon
    Then I see the resources displayed in a single column
      And I see the content thumbnail on the left
      And I see the content metadata and description on the right

    When I click the *Grid Icon * in the right corner of the main content grid
      And I see the "View as grid" tooltip on hover over the icon
    Then I see the resources displayed in 3 columns on all screens larger than a mobile device
      And I see the content thumbnail on the top
      And I see the content title below the thumbnail
      And I see two footer buttons - for more information and more options

  Scenario: View more results (MM)
    When I have searched or filtered for results and there are more than 25 matching pieces of content
    Then I see *View More* in the results header and at the bottom of the page

    When I click *View More* in either location
    Then I see up to 25 more results added on to the end of the list

  Scenario: No folders in search results
    Given the search results include folders
    Then I do not see folders in my search results
