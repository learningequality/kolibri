Feature: Coach lesson report
  Coach needs to be able to see the lesson report details

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on the *Coach > Lessons* page
      And I see the lesson <lesson>

  Scenario: View the lesson report details
    When I click the lesson <lesson>
    Then I am on the <lesson> page
      And I see the list of lesson resources
      And I see the progress bars for each of the resources
    When I click the <resource> resource
    Then I am on the *Lesson report details* page
      And I see the progress on <resource> resource for each of the learners lesson <lesson> is assigned to

Examples:
| lesson   | resource           |
| Division | One digit division |
