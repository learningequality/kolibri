Feature: Skip to content link
  Accessibility feature to allow keyboard users to jump over navigation directly to content

Background:
  Given I am on any page in the application that displays the full top app bar

Scenario: Use 'skip to content' link
  When I first arrive at the page
  And I press 'tab'
  Then a 'skip' link becomes visible in the top left corner and has keyboard focus
  When I press 'enter'
  Then the 'skip' link becomes hidden and keyboard focus is placed on the first selectable item in the content pane
  When I press 'shift-tab'
  Then keyboard selection goes up to the last selectable item in the top app bar

Scenario: Do not use 'skip to content' link
  When I first arrive at the page
  And I press 'tab'
  Then a 'skip' link becomes visible in the top left corner and has keyboard focus
  When I press 'tab' again
  Then the 'skip' link becomes hidden and keyboard focus is placed on the first selectable item in the top app bar
  When I press 'shift-tab'
  Then the 'skip' link becomes visible in the top left corner and has keyboard focus again
