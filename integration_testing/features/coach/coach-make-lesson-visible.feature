Feature: Coach makes lessons visible
   Coaches need to make lessons visible in order for learners to gain access and start working with them, and make them invisible afterwards

  Background:
    Given I am signed in to kolibri as Coach user
      And I am on *Coach - '<class>' > Plan > Lessons* page
      And I see the table of lessons which includes <lesson>
      And in the second browser or an incognito tab I am signed in as a learner on *Learn > Classes > '<class>'*

  Scenario: Coach turns ON the lesson *Visible for learners* status
    Given that switch in the column *Visible to learners* for the lesson <lesson> is in the OFF position (gray)
      When I click the switch for <lesson>
      Then I see the switch slide in the ON position (green)
        And I see a snackbar notification that says *Lesson is visible to learners*
      When I reload the browser as a learner
        Then I see the lesson '<lesson>'

  Scenario: Coach turns OFF the lesson *Visible for learners* status
    Given that switch in the column *Visible to learners* for the lesson <lesson> is in the ON position (green)
      When I click the switch for <lesson>
      Then I see the switch slide in the OFF position (gray)
        And I see a snackbar notification that says *Lesson is not visible to learners*
      When I reload the browser as a learner
        Then I don't see the lesson '<lesson>'

  Background:
    Given I am signed in to kolibri as coach user
      And I am on *Coach - '<class>' > Report > Lessons* page
      And I see the table of lessons which includes <lesson>

  Scenario: Coach turns ON the lesson *Visible for learners* status
    Given that switch in the column *Visible to learners* for the lesson <lesson> is in the OFF position (gray)
      When I click the switch for <lesson>
      Then I see the switch slide in the ON position (green)
        And I see a snackbar notification that says *Lesson is visible to learners*
      When I reload the browser as a learner
        Then I see the lesson '<lesson>'

  Scenario: Coach turns OFF the lesson *Visible for learners* status
    Given that switch in the column *Visible to learners* for the lesson <lesson> is in the ON position (green)
      When I click the switch for <lesson>
      Then I see the switch slide in the OFF position (gray)
        And I see a snackbar notification that says *Lesson is not visible to learners*
      When I reload the browser as a learner
        Then I don't see the lesson '<lesson>'

  Background:
    Given I am signed in to Kolibri as a Coach user
      And I am on *Coach - '<class>' > Plan > Lessons > '<lesson>'* page

  Scenario: Coach turns ON the lesson *Visible for learners* status
    Given that switch *Visible to learners* is in the OFF position (gray)
      When I click the switch for <lesson>
      Then I see the switch slide in the ON position (green)
        And I see a snackbar notification that says *Lesson is visible to learners*
      When I reload the browser as a learner
        Then I see the lesson '<lesson>'

  Scenario: Coach turns OFF the lesson *Visible for learners* status
    Given that switch *Visible to learners* is in the ON position (green)
      When I click the switch for <lesson>
      Then I see the switch slide in the OFF position (gray)
        And I see a snackbar notification that says *Lesson is not visible to learners*
      When I reload the browser as a learner
        Then I don't see the lesson '<lesson>'

  Background:
    Given I am signed in to Kolibri as a Coach user
      And I am on *Coach - '<class>' > Report > Lessons > '<lesson>'* page

  Scenario: Coach turns ON the lesson *Visible for learners* status
    Given that switch *Visible to learners* is in the OFF position (gray)
      When I click the switch for <lesson>
      Then I see the switch slide in the ON position (green)
        And I see a snackbar notification that says *Lesson is visible to learners*
      When I reload the browser as a learner
        Then I see the lesson '<lesson>'

  Scenario: Coach turns OFF the lesson *Visible for learners* status
    Given that switch *Visible to learners* is in the ON position (green)
      When I click the switch for <lesson>
      Then I see the switch slide in the OFF position (gray)
        And I see a snackbar notification that says *Lesson is not visible to learners*
      When I reload the browser as a learner
        Then I don't see the lesson '<lesson>'

Examples:
| lesson                |
| mathematics exercises |

