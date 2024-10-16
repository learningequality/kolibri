Feature: Coach edits quizzes
  Coach needs to be able to edit existing quiz details

  Background:
    Given I am signed in to Kolibri as a coach user
      And there is a quiz which is started
      And I am on the *Coach - '<class>' > Quizzes > '<quiz>'* page

  Scenario: Edit existing quiz title
      When I click the *...* button
        And I select *Edit details*
      Then I see the *Edit quiz details* page
        And the title field is focused by default
      When I change the quiz title
        And I click *Save and close* button
      Then I am back at *Coach - '<class>' > Quizzes
      	And I see the snackbar message *Changes saved successfully*

  Scenario: Reassign quiz
    When I click the *...* button
      And I select *Edit details*
    Then I see the full-page *Edit quiz details* modal
    When I change the *Recipients* by selecting one of the groups or some individual learners
      And I click *Save and close* button
    Then I am back at *Coach - '<class>' > Quizzes
      	And I see the snackbar message *Changes saved successfully*
				And I see the change under *Recipients* in the quizzes table
