Feature: Learners can discover practice quizzes in search results
  Scenario: Practice quizzes in search results
    Given that I am on the 'Learn > Library > Search' page
      And I made a search related to practice quizzes
    Then I see practice-type resources appear in the search results

  Scenario: Practice quizzes details
    Given that there are practice-type resources in search results
    When I click on an practice quiz in the search results
      And it does not have copies in other tree locations
    Then I am on the channel location of that practice quiz

  Scenario: Practice quizzes with multiple locations
    Given that there are practice-type resources in search results
      And there is a practice quiz with multiple locations (I see 'n locations' indicator on the card)
    When I click on that quiz card
    Then I see a dialog with the different locations of the practice quiz
