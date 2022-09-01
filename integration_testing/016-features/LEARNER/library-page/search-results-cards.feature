Feature: Search results cards

# Comment here

  Background:
    Given there are channels on my device
      And I am on the *Library* tab
      And I started a search
      And I am viewing the search results page

  Scenario: View resource info (MM)
    When I click *Info Icon* on the bottom of a result card
      And I see the "View information" tooltip on hover
    Then I see a side panel open on the side of the page
      And I see a backdrop cover the main content
      And I see the metadata information for the resource
