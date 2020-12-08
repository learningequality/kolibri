Feature: Admin changes facility settings
  Admin needs to be able to change the user sign-in/up, self-edit, and content download options according to the needs of the facility

  Background:
    Given The user is signed in to Kolibri as facility admin user
      And The user is on *Facility > Settings* page
      And There are learner and coach user accounts created in the facility

  Scenario: Allow username edit
    Given The *Allow learners and coaches to edit their username* checkbox is checked
    When The user unchecks the *Allow learners and coaches to edit their username* checkbox
      And The user clicks the *Save changes* button
      And The user signs out
      And The user signs in as learner <learner>, or coach <coach>
      And The user (as learner <learner>, or coach <coach>) opens the user menu
      And The user selects *Profile*
    Then The user (as learner <learner>, or coach <coach>) sees that the *Username* field is not editable

    Scenario: Allow password change
      Given The *Allow learners and coaches to change their password when signed in* checkbox is checked
      When The user unchecks the *Allow learners and coaches to change their password when signed in* checkbox
        And The user clicks the *Save changes* button
        And The user signs out
        And The user signs in as learner <learner>, or coach <coach>
        And The user (as learner <learner>, or coach <coach>) opens the user menu
        And The user selects *Profile*
      Then The user (as learner <learner>, or coach <coach>) doesn't see the *Change password* link

  Scenario: Allow full name edit
    Given The *Allow learners and coaches to edit their full name* checkbox is checked
    When The user unchecks the *Allow learners and coaches to edit their full name* checkbox
      And The user clicks the *Save changes* button
      And The user signs out
      And The user signs in as learner <learner>, or coach <coach>
      And The user (as learner <learner>, or coach <coach>) opens the user menu
      And The user selects *Profile*
    Then The user (as learner <learner>, or coach <coach>) sees that the *Full name* field is not editable

  Scenario: Allow visitors to create accounts
    Given The *Allow learners to create accounts* checkbox is unchecked
    When The user checks the *Allow learners to create accounts* checkbox
      And The user clicks the *Save changes* button
      And The user signs out
    Then The user sees the *Create an account* button on the sign-in page

  Scenario: Allow simplified sign-in
    Given The *Allow learners to sign in with no password* checkbox is unchecked
    When The user checks the *Allow learners to sign in with no password* checkbox
      And The user clicks the *Save changes* button
      And The user signs out
    Then The user doesn't see the *Password* field on the sign-in page
      And The user is able to sign-in as learner <learner> and no password

  Scenario: Allow content download
    Given The *Show 'download' button with content* checkbox is unchecked
    When The user checks the *Show 'download' button with content* checkbox
      And The user clicks the *Save changes* button
    When The user goes to *Learn > Channels* page
      And The user browses any channel's topics until he/she opens a single resource
    Then The user sees the *Download content* button

  Scenario: Allow guest browsing
    Given The *Allow users to access content without signing in* checkbox is unchecked
    When The user checks the *Allow users to access content without signing in* checkbox
      And The user clicks the *Save changes* button
      And The user signs out
    Then The user sees the *Continues as a guest* link on the sign-in page
    When The user clicks *Continues as a guest*
    Then The user sees the *Learn > Channels* page


Examples:
| full_name | username | password |
| Pinco P.  | coach    | coach    |
| Neela R.  | ccoach   | ccoach   |
| John C.   | learner  | learner  |
