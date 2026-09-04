Feature: kolibri-server handles urls with more than 50 args
  If the url contains many (>50 args) in the url, they should not be limited

  Background:
    Given that the kolibri-server is installed and running
    	And I am signed in to Kolibri as a coach or super-admin
      And a channel with token 'nakav-mafak' is installed

  Scenario: Coach can interact correctly with the content of a lesson with multiple args
    When I create a new class <class> and a new lesson <lesson> in class <class>
      And I add more than 50 resources to the lesson <lesson>
      And I activate the lesson <lesson>
      And I go to *Learn > Home > Classes* and select the class <class>
      And I open the lesson <lesson>
    Then I can view and interact correctly with the content of the lesson <lesson>
