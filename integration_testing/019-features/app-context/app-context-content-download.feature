Feature: Learner does not see the 'download' resource button

  Background:
    Given that Kolibri is running in app context
      And the *Show 'download' button with resources* option at *Facility > Settings* page is disabled

  Scenario: Lesson content download
     When I go to *Learn > Home > Classes > Lesson* page
      And I open a lesson
    Then I don't see the *Download resource* button

  Scenario: Channel content download
    When I go to *Learn > Home* page
      And I browse any channel's topics until I open an single resource
    Then I don't see the *Download resource* button
