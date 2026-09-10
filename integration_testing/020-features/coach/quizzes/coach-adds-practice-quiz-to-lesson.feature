Feature: Coach adds practice quiz to a lesson

  Scenario: Coach can add a practice quiz to a lesson resource list
    Given that I am on the lesson resource management page
    When I browse the content tree
      And I find and select the checkbox of a practice quiz card
      And I click *Save & Finish*
    Then I see a snackbar appear confirming my action
	    And I see that the practice quiz is in the lesson resources list

  Scenario: Coach can preview a practice quiz before adding it to a lesson
    Given that I am on the lesson resource management page
    When I browse the content tree
      And I find and click on a practice quiz content card
    Then I see a preview of the practice quiz
