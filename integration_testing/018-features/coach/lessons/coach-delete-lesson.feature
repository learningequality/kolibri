Feature: Coach deletes lesson
  Coach needs to be able to delete the lesson when necessary

  Background:
    Given I am signed in to Kolibri as a coach
      And I am at *Coach - '<class>' > Lessons* page
      And there is at least one created lesson

  Scenario: Delete a lesson
    When I click the title of a lesson
    Then I am at the lesson's details page
     When I click the *...* button
      And I select *Delete*
    Then I see the *Delete lesson* modal
    When I click the *Delete* button
    Then the modal closes
    	And I am back at *Coach - '<class>' > Lessons* page
      And the snackbar notification appears
      And I no longer see the lesson in the *Lessons* table
