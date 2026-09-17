Feature: Search results

  Background:
    Given there are imported channels on my device
      And I am on the *Library* tab
      And I've initiated a search with applied filters
      And I am viewing the search results page

  Scenario: View resource information
    When I click *View information* on the bottom of a result card
      And I see the *View information* tooltip on hover
    Then I see a side panel open on the right side of the page
      And I see a backdrop cover the main content
      And I see the available metadata information for the resource
      And I see a *View resource* button

  Scenario: View a resource and go back to the search results
  	When I click on a resource card
  	Then I can see and interact with the resource
  	When I click the *Go back* arrow
  	Then I am back at the search results page
  		And I can see all the previously selected filters
  		And I can see all of the previously returned search results

  Scenario: Clear one filter
    When I remove a chip for <filter option> in <filter field> above the search results
    Then I see the chip for <filter option> is removed from the header
      And I see search results matching <filter option> are no longer included
      And I see <filter option> is no longer selected in the filter panel

  Scenario: Clear all filters
    When I click *Clear all* for <filter options> chips above the search results
    Then I see the default *Library* state
      And I see search results matching <filter options> are no longer included
      And I see the chips for <filter options> are removed from the header
      And I see <filter option> is no longer selected in the filter panel

  Scenario: Toggle list and grid view
    When I click the *View as list* icon in the right corner of the main content grid
      And I see the *View as list* tooltip on hover over the icon
    Then I see the resources displayed in a single column
      And I see the content thumbnail on the left
      And I see the content metadata and description on the right

    When I click the *View as grid* icon in the right corner of the main content grid
      And I see the *View as grid* tooltip on hover over the icon
    Then I see the resources displayed in 3 columns on all screens larger than a mobile device
      And I see the content thumbnail on the top
      And I see the content title below the thumbnail
      And I see two footer buttons - for more information and more options

  Scenario: View more results
    Given I have searched or filtered for results and there are more than 25 matching pieces of content
    When I scroll down to the bottom of the page
    Then I see a *View more* link at the bottom of the page
    When I click the *View more* link
    Then I see up to 25 more results added on to the end of the list
