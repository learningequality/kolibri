Feature: Super admin can edit their own profile information
	Super admin needs to be able to edit their own profile information

  Background:
    Given I am signed in to Kolibri as Super admin
      And I am at the *User > Profile* page

  Scenario: Super admin can edit their profile information
  	When I click the *Edit* button
    Then I see the *Edit profile* page
    When I change any of the available editable fields such as *Full name*, *Username*, *Gender* and *Birth year*
      And I click the *Save* button
    Then I am back at the *Profile* page
    	And I see the *Changes saved* snackbar notification
	    And I can verify that the edited fields are saved correctly

  Scenario: Super admin can change their password
     When I click the *Change password* link
     Then I see the *Change password* modal
     When I enter the new password
      And I re-enter the new password
      And I click the *Update* button
    Then the modal closes
    	And I see the *Your password has been changed* snackbar notification
