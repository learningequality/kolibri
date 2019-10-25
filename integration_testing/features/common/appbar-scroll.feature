Feature: Scrolling app bar
    Top app bar should become visible when scrolling up and hidden when scrolling down on mobile

  Background:
    Given that I am on a page with lots of content
      And I'm browsing on a small screen

  Scenario: Scrolling down on a small screen
    When I scroll down
    Then The app bar disappears

  Scenario: Scrolling down on a large screen
    When I scroll down
    Then The app bar stays visible

  Scenario: Scrolling up on a small screen
    When I scroll up
    Then The app bar re-appears

  Scenario: Momentum scrolling works
  # Note: Can also test this on certain EPUB and PDF documents
    When I scroll with my finger very quickly
      And I lift my finger from the screen
    Then the contents of the page continue to move, as if on a slippery surface
