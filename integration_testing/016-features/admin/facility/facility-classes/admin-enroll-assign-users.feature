Feature: Admin enrolls learners and assign coaches to classes
  Admin needs to be able to enroll learners and assign coaches to classes in the facility

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am on *Facility > Classes* page
      And there is a class created in the facility
      And there are learner and coach users created in the facility

  Scenario: Enroll learners to a class
    When I click on class
    Then I see the class page
    When I click the *Enroll learners* button
    Then I see the *Enroll learners into '<class>'* page
      And I see a list with all the learners who are not enrolled in the class yet
    When I select a learner or several learners
    Then I see that the *Confirm* button is enabled
    When I click the *Confirm* button
    Then I am back at the class page
    	And I see a *Learner(s) enrolled* snackbar message
      And I see the selected learners listed under *Learners*

  Scenario: Remove a learner from a class
    Given a learner is enrolled in the class
      And I am at the class page
    When I click the *Remove* button to the right of the learner's username
    Then I see the *Remove user* modal
    When I click the *Remove* button
    Then the modal closes
    	And I see a *Learner removed* snackbar message
      And see that the learner is removed from the *Learners* table

  Scenario: Assign coaches to a class
    Given I am at the class page
    When I click the *Assign coaches* button
    Then I see the *Assign a coach to '<class>'* page
      And I see the list of all coaches who are not assigned to the class yet
    When I select a coach or several coaches
    Then I see that the *Confirm* button is enabled
    When I click the *Confirm* button
    Then I am back at the class page
    	And I see a *Coach(es) assigned* snackbar message
      And I see the selected coaches listed under *Coaches*

  Scenario: Remove a coach from a class
    Given a coach is assigned to the class
      And I am at the class page
    When I click the *Remove* button to the right of the coach's username
    Then I see the *Remove user* modal
    When I click the *Remove* button
    Then the modal closes
    	And I see a *Coach removed* snackbar message
      And see that the learner is removed from the *Learners* table
