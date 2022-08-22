Feature: Admin changes facility settings
  Admin needs to be able to change the user sign-in/up, self-edit, and content download options according to the needs of the facility

  # When testing in app-context make sure to go thorough the 'app-context-manage-sign-in-options.feature' scenario too

  Background:
    Given I am signed in to Kolibri as a super admin or a facility admin user
      And I am on *Facility > Settings* page
      And there are learner and coach user accounts created in the facility

  Scenario: Allow username edit
    Given the *Allow learners to edit their username* checkbox is checked
    When I uncheck the *Allow learners to edit their username* checkbox
      And I click the *Save changes* button
      And I sign out
      And I sign in as learner <learner>
      And I (as learner <learner>) open the user menu
      And I select *Profile*
      And The user clicks the Edit button
    Then I (as learner <learner>) see that the *Username* field is not editable

  Scenario: Allow full name edit
    Given the *Allow learners to edit their full name* checkbox is checked
    When I uncheck the *Allow learners to edit their full name* checkbox
      And I click the *Save changes* button
      And I sign out
      And I sign in as learner <learner>
      And I (as learner <learner>) open the user menu
      And I select *Profile*
      And The user clicks the Edit button
    Then I (as learner <learner>) see that the *Full name* field is not editable

  Scenario: Allow visitors to create accounts
    Given the *Allow learners to create accounts* checkbox is unchecked
    When I check the *Allow learners to create accounts* checkbox
      And I click the *Save changes* button
      And I sign out
    Then I see the *Create an account* button on the sign-in page

  Scenario: Allow simplified sign-in
    Given the *Require password for learners* checkbox is checked
      And the *Allow learners to change their password when signed in* checkbox is enabled
    When I uncheck the *Require password for learners* checkbox
    Then I see the *Allow learners to change their password when signed in* checkbox is now disabled (grayed out)
    When I click the *Save changes* button
      And I sign out
    Then I don't see the *Password* field on the sign-in page
      And I'm able to sign-in as learner <learner> without a password

  Scenario: Allow password change for learners
    Given the *Require password for learners* checkbox is checked
      And the *Allow learners to change their password when signed in* checkbox is disabled (grayed out)
      And I click the *Save changes* button
      And I sign out
      And I sign in as learner <learner>
      And I (as learner <learner>) open the user menu
      And I select *Profile*
    Then I (as learner <learner>) can see the *Change password* link

  Scenario: Allow content download
    Given the *Show 'download' button with resources* checkbox is unchecked
      And Kolibri is not running in the app context
    When I check the *Show 'download' button with resources* checkbox
      And I click the *Save changes* button
    When I go to *Learn > Channels* page
      And browse any channel's topics until I open an single resource
    Then I see the *Download resource* button

Examples:
| full_name | username | password |
| Pinco P.  | coach    | coach    |
| Neela R.  | ccoach   | ccoach   |
| John C.   | learner  | learner  |
