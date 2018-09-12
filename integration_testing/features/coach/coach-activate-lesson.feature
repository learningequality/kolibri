Feature: Coach activate lessons
   Coaches need to activate lessons in order for learners to gain access and start submitting them

  Background:
    Given I am signed in to kolibri as coach user
      And I am on *Coach > Lessons* page
      And I see the lesson <lesson_title>

  Scenario: Coach changes the lesson status to *Active*
    When I click the lesson <lesson_title>
    Then I see the <lesson_title> lesson page
      And I see the lesson *Status* is *Inactive*
    When I click *Change*
    Then I see the *Change lesson status* modal
    When I select *Active*
      And I click *Save* button
    Then the modal closes
      And I see the lesson *Status* is *Active*

Examples:
| lesson_title          |
| mathematics exercises |
