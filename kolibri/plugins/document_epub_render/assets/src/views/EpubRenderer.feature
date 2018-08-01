Feature: EPUB renderer

   Renders EPUB files.

   Scenario: A valid epub is provided
    Given that a valid epub file is provided
    When the the epub renderer loads
    Then the epub should be rendered

  Scenario: A corrupt epub is provided



# zoom in out buttons
# search button
# font size plus
# font size minus
# theme
# scrubber
# fullscreen
# table of contents
