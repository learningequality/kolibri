Feature: Skip to main content link
  Accessibility feature to allow keyboard users to jump over navigation directly to content

Background:
  Given I am at any page in the application that displays the full top app bar

Scenario: Use *Skip to main content* link
  When I first arrive at a page
  	And I press the *tab* button on my keyboard
  Then a *Skip to main content* link becomes visible in the top left corner of the browser and has the keyboard focus
  When I press the *enter* button on my keyboard
  Then the *Skip to main content* link becomes hidden and the keyboard focus is placed on the first selectable item in the content pane
  When I press *shift-tab*
  Then keyboard selection goes up to the last selectable item in the top app bar

Scenario: Do not use the *Skip to main content* link
  Given the *Skip to main content* link is visible in the top left corner and has keyboard focus
  When I press the *tab* button on my keyboard
  Then the *Skip to main content* link becomes hidden and the keyboard focus is placed on the first selectable item in the top app bar
  When I press *shift-tab*
  Then the *Skip to main content* link becomes visible in the top left corner and has keyboard focus again
