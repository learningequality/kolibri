Feature: Admin changes facility settings
  Admin needs to be able to change the user sign-in/up, self-edit, and content download options according to the needs of the facility

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am at *Facility > Settings* page
      And there are learner and coach user accounts created in the facility

  Scenario: Change the facility name
  	When I click *Edit* next to the facility name
  	Then I see the *Rename facility* modal
  	When I enter a new name
  		And I click the *Save* button
  	Then I see the *Changes saved* snackbar message
  		And I see the new facility name

  Scenario: Allow and disallow full name and username edit
    Given both the *Allow learners to edit their username* and the *Allow learners to edit their full name* checkboxes are checked
    When I sign in to Kolibri in a separate browser as a learner
      And I go to the *Profile* page
      And I click the *Edit* button
    Then I see the *Edit profile* page
    	And I see that both the *Full name* and *Username* fields are editable
    When as an admin I uncheck both the *Allow learners to edit their username* and the *Allow learners to edit their full name* checkboxes
      And I click the *Save changes* button
    Then I see the *Facility settings updated* snackbar message
    When as a learner I sign in again to Kolibri in a separate browser
      And I go to the *Profile* page
      And I click the *Edit* button
    Then I see the *Edit profile* page
    	And I see that both the *Full name* and *Username* fields are not editable

  Scenario: Allow and disallow visitors to create accounts
    Given the *Allow learners to create accounts* checkbox is unchecked
    When I check the *Allow learners to create accounts* checkbox
      And I click the *Save changes* button
    Then I see the *Facility settings updated* snackbar message
    When I open Kolibri in a separate browser
    Then I see the *Create an account* button on the sign-in page
    When as an admin I check the *Allow learners to create accounts* checkbox
    And I click the *Save changes* button
    Then I see the *Facility settings updated* snackbar message
    When I open Kolibri in a separate browser
    Then I no longer see the *Create an account* button on the sign-in page

  Scenario: Allow simplified sign-in
    Given the *Require password for learners* checkbox is unchecked
    When I check the *Require password for learners* checkbox
      And I click the *Save changes* button
    Then I see the *Facility settings updated* snackbar message
    When as a learner I open Kolibri in a separate browser
    Then I don't see the *Password* field at the sign-in page
      And I can sign-in without a password

  Scenario: Allow and disallow password change
    Given both the Require password for learners* and *Allow learners to change their password when signed in* checkboxes are checked
    When as a learner I sign in to Kolibri in a separate browser
      And I go to the *Profile* page
    Then I can see the *Change password* link
    When as an admin I uncheck the *Allow learners to change their password when signed in* checkbox
      And I click the *Save changes* button
    Then I see the *Facility settings updated* snackbar message
    WWhen as a learner I sign in to Kolibri in a separate browser
      And I go to the *Profile* page
    Then the *Change password* link is no longer visible

  Scenario: Allow and disallow content download
    Given the *Show 'download' button with content* checkbox is checked
    When as a learner I sign in to Kolibri in a separate browser
      And I go to the *Learn > Library*
      And I open a single resource
      And I click the *View information* icon
    Then I see the *Save to device* button
    When as an admin I uncheck the *Show 'download' button with content* checkbox
      And I click the *Save changes* button
    Then I see the *Facility settings updated* snackbar message
    When as a learner I sign in to Kolibri in a separate browser
      And I go to the *Learn > Library*
      And I open a single resource
      And I click the *View information* icon
    Then I no longer see the *Save to device* button
