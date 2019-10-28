Feature: Coach activates and deactivates lessons
   Coaches need to activate lessons in order for learners to gain access and start submitting them, and deactivate them afterwards

  Background:
    Given I am signed in to kolibri as coach user
      And I am on *Coach - '<class>' > Plan > Lessons* page
      And I see the table of lessons which includes <lesson>

  Scenario: Coach changes the lesson status to *Active*
    Given that lesson <lesson> *Status* is *Inactive*
      When I click the switch in the *Visible to learners* column on the row for <lesson>
      Then I see the switch slide to the *Active* position
        And I see a snackbar notification that says *Lesson is visible to learners*

  Scenario: Coach changes the lesson status to *Inactive*
    Given that lesson <lesson> *Status* is *Active*
      When I click the switch in the *Visible to learners* column on the row for <lesson>
      Then I see the switch slide to the *Inactive* position
        And I see a snackbar notification that says *Lesson is not visible to learners*

  Background:
    Given I am signed in to kolibri as coach user
      And I am on *Coach - '<class>' > Report > Lessons* page
      And I see the table of lessons which includes <lesson>

  Scenario: Coach changes the lesson status to *Active*
    Given that lesson <lesson> *Status* is *Inactive*
      When I click the switch in the *Visible to learners* column on the row for <lesson>
      Then I see the switch slide to the *Active* position
        And I see a snackbar notification that says *Lesson is visible to learners*

  Scenario: Coach changes the lesson status to *Inactive*
    Given that lesson <lesson> *Status* is *Active*
      When I click the switch in the *Visible to learners* column on the row for <lesson>
      Then I see the switch slide to the *Inactive* position
        And I see a snackbar notification that says *Lesson is not visible to learners*

  Background:
    Given I am signed in to Kolibri as a Coach user
      And I am on *Coach - '<class>' > Plan > Lessons > '<lesson>'* page

  Scenario: Coach changes the lesson status to *Active*
    Given that lesson <lesson> *Status* is *Inactive*
      When I click the switch next to the label *Visible to learners*
      Then I see the switch slide to the *Active* position
        And I see a snackbar notification that says *Lesson is visible to learners*

  Scenario: Coach changes the lesson status to *Inactive*
    Given that lesson <lesson> *Status* is *Active*
      When I click the switch next to the label *Visible to learners*
      Then I see the switch slide to the *Inactive* position
        And I see a snackbar notification that says *Lesson is not visible to learners*

  Background:
    Given I am signed in to Kolibri as a Coach user
      And I am on *Coach - '<class>' > Plan > Lessons > '<lesson>'* page

  Scenario: Coach changes the lesson status to *Active*
    Given that lesson <lesson> *Status* is *Inactive*
      When I click the switch next to the label *Visible to learners*
      Then I see the switch slide to the *Active* position
        And I see a snackbar notification that says *Lesson is visible to learners*

  Scenario: Coach changes the lesson status to *Inactive*
    Given that lesson <lesson> *Status* is *Active*
      When I click the switch next to the label *Visible to learners*
      Then I see the switch slide to the *Inactive* position
        And I see a snackbar notification that says *Lesson is not visible to learners*

Examples:
| lesson                |
| mathematics exercises |
