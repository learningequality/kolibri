Feature: kolibri-server handles urls with more than 50 args
  If the url contains many (>50 args) in the url, they should not be limited

  Background:
    Given that the kolibri-server is installed and running
        And channel with token 'nakav-mafak' is installed

  Scenario: Lesson with multiple args
    Given I am signed in to Kolibri as a coach or super-admin
    When I create a new class <class> and a new lesson <lesson> in <class>
      And I add more than 50 resources to <lesson>
      And I activate <lesson>
      And I go to *Learn > Classes* and select <class>
      And I open <lesson>
    Then I can view and interact correctly with the content
