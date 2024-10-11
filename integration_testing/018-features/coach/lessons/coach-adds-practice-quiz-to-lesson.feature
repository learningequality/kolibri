Feature: Coach adds practice quiz to a lesson

  Scenario: Coaches can add a practice quiz to a lesson resource list
    Given that I am on the lesson resource management page
    When I browse the content tree
      And I find and select a practice quiz card checkbox
    Then I see a snackbar appear confirming my action
    When I exit the lesson resource management page
    Then I see that the practice quiz is in the lesson resource list

  Scenario: Coaches preview a practice quiz before adding it to a lesson
    Given that I am on the lesson resource management page
    When I browse the content tree
      And I find and click an practice quiz content card
    Then I see a preview of the practice quiz
