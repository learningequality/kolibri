Feature: Coach deletes lesson
  Coach needs to be able to delete the lesson when necessary

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach - '<class>' > Plan > Lessons* page
      And I see the lesson <lesson>

  Scenario: Delete lesson
    When I click the lesson <lesson>
    Then I see the <lesson> lesson page
     When I click *Options* button
      And I select *Delete*
    Then I see the *Delete lesson* modal
    When I click *Delete* button
    Then the modal closes
      And the snackbar notification appears
      And I don't see the <lesson> on the list of *Lessons*
    But if I click the *Cancel* button
    Then the modal closes
      And I still see the lesson on the list

Examples:
| lesson     |
| Counting 2 |
