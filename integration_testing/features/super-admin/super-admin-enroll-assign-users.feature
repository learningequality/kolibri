Feature: Super admin enrolls learners and assigns coaches to classes
    Super admin needs to be able to enroll learners and assign coaches to classes in the facility

  Background:
    Given I am signed in to Kolibri as Super admin
      And I am on *Facility > Classes* page
      And there is a class <class> in the facility
      And there are learner and coach users created in the facility

  Scenario: Enroll learners to a class
    When I click on class <class>
    Then I see the class <class> page
    When I click the *Enroll learners* button
    Then I see the *Enroll learners into '<class>'* page
      And I see the list of all learners not enrolled in <class>
    When I click on the checkbox(es) of the learner(s) I want to enroll
    Then I see the *Confirm* button is active
    When I click the *Confirm* button
    Then I see the class <class> page again
      And I see the selected learner user accounts listed under *Learners*

  Scenario: Assign coaches to a class
    When I click on class <class>
    Then I see the class <class> page
    When I click the *Assign coaches* button
    Then I see the *Assign a coach to '<class>'* page
      And I see the list of all coaches not assigned to <class>
    When I click on the checkbox(es) of the coach(es) I want to assign
    Then I see the *Confirm* button is active
    When I click the *Confirm* button
    Then I see the class <class> page again
      And I see the selected coach user accounts listed under *Coaches*

Examples:
| class    |
| Primera  |
| Segunda  |
