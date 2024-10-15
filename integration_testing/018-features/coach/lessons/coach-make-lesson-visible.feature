Feature: Coach makes lessons visible/invisible
   Coaches need to make lessons visible so that learners can see and interact with them. A coach can also make them invisible afterwards.

  Background:
    Given I am signed in to Kolibri as Coach
      And I am at *Coach - '<class>' > Lessons* page
      And I've already created several lessons with resources
      And the lessons are not yet visible to the learners
      And in a different browser or using an incognito tab I am signed in as a learner at *Learn > Home > Classes > '<class>'*

  Scenario: Coach turns on/off the lesson *Visible for learners* status
    When I click the *Visible for learners* switch for a lesson
    Then I see the switch slide in the ON position (blue)
      And I see the *Lesson is visible to learners* snackbar notification
    When as a learner I reload the class page
    Then I see the lesson
    When as a coach I turn off the *Visible for learners* switch for the same lesson
    Then I see the *Lesson is not visible to learners* snackbar notification
    When as a learner I reload the class page
    Then I no longer see the lesson #repeat the same scenario while at the lesson details page

  Scenario: Coach turns on/off the lesson *Visible for learners* status - Learn-only devices
    Given there are learners using Learn-only devices in this class
    When I click the *Visible for learners* switch for a lesson
    Then I see the switch slide in the ON position (blue)
      And I see a modal open that says *Make lesson visible* and displays the total size in bytes for the current lesson
    When I click *Continue*
    Then I see the *Lesson is visible to learners* snackbar notification
    When I reload the browser as a learner #after the device has synced with the server
    Then I see the lesson
    When as a coach I turn off the *Visible for learners* switch for the same lesson
    Then I see the *Lesson is not visible to learners* snackbar notification
    When as a learner I reload the class page #after the device has synced with the server
    Then I no longer see the lesson #repeat the same scenario while at the lesson details page
