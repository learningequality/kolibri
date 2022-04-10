Feature: Coach sees detailed information for difficult questions in practice quiz report from lessons

  Scenario: Coach sees detailed information for difficult questions
    Given that I am in 'Reports'
      And I click on the 'Lessons' subtab
      And I click on a lesson title
      And I click on the title of an practice quiz in the 'Reports' subtab
      And I click on the 'Difficult questions' subtab
    When I select the difficult question
    Then I see a list of learners who got the question incorrect, a preview of the question, and the option to show the correct answer.

  Scenario: coach sees the correct difficult questions for most recent attempt
    Given that I am in 'Reports'
      And I click on the 'Lessons' subtab
      And I click on a lesson title
      And I click on the title of an practice quiz in the 'Reports' subtab
    When I click on the 'Difficult questions' subtab
    Then I see the correct difficult questions for most recent attempt
