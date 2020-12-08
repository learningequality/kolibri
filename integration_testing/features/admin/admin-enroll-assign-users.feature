Feature: Admin enrolls learners and assign coaches to classes
  Admin needs to be able to enroll learners and assign coaches to classes in the facility

  Background:
    Given The user is signed in to Kolibri as a facility admin user
      And The user is on *Facility > Classes* page
      And There is a class created in the facility
      And There are learner and coach users created in the facility

  Scenario: Enroll learners to a class
    When The user clicks on class <class>
    Then The user sees the class <class> page
    When The user clicks the *Enroll learners* button
    Then The user sees the *Enroll learners into '<class>'* page
      And The user sees the list of all learners not enrolled in <class>
      And The user sees the *Confirm* button is not active
    When The user clicks on the checkbox(es) of the learner(s) he/she wants to enroll
    Then The user sees the *Confirm* button is active
    When The user clicks the *Confirm* button
    Then The user sees the class <class> page again
      And The user sees the selected learner user accounts listed under *Learners*

  Scenario: Remove learner from a class
    Given The learner <learner> is enrolled in the class <class>
      And The user is on class <class> page
    When The user clicks the *Remove* button for <learner>
    Then The user sees the *Remove user* modal asking for confirmation
    When The user clicks *Remove* button
    Then The modal closes
      And The user doesn't see <learner> user account listed under *Learners*

  Scenario: Assign coaches to a class
    When The user clicks on class <class>
    Then The user sees the class <class> page
    When The user clicks the *Assign coaches* button
    Then The user sees the *Assign a coach to '<class>'* page
      And The user sees the list of all coaches not assigned to <class>
      And The user sees the *Confirm* button is not active
    When The user clicks on the checkbox(es) of the coach(es) he/she wants to assign
    Then The user sees the *Confirm* button is active
    When The user clicks the *Confirm* button
    Then The user sees the class <class> page again
      And The user sees the selected coach user accounts listed under *Coaches*

  Scenario: Remove coach from a class
    Given The coach <coach> is assigned to the class <class>
      And The user is on class <class> page
    When The user clicks the *Remove* button for <coach>
    Then The user sees the *Remove user* modal asking for confirmation
    When The user clicks *Remove* button
    Then The modal closes
      And The user doesn't see <coach> user account listed under *Coaches*

Examples:
| class    |
| Primera  |
| Segunda  |
