Feature: Multiple facility sign in
  Kolibri users need to have a streamlined sign in and account creation experience when there is more than one facility on the device.

  Background:
    Given there is more than one facility on the device
      And I am on the sign in page

  Scenario: User accesses Kolibri for the first time on their browser and creates a new account
    Given I am viewing Kolibri for the first time in my current browser
      And there is no account that has signed in before on the device
    When I open Kolibri in my browser
    Then I see *Are you a new user?*
      And I see a *Create an account* button
      And I see *Sign in if you have an existing account*
      And I see a *Sign in* button
      And I see a *Explore without account* link

  Scenario: User creates account when there is more than one facility on the device
    When I open Kolibri in the browser
    Then I see *Are you a new user?*
    When I click *Create an account*
    Then I see *Select the facility that you want to associate your new account with:*
      And I see a list of facilities on the device
    When I click <facility>
    Then I see the *Create an account* form
      And I see <facility> under *Facility*
    When I enter a valid username, full name, and password
    When I click *Continue*
    Then I see *Gender* and *Birth year* dropdowns
    When I click *Finish*
    Then I see the *Learn > Home* page
      And I see my username in the top right

  Scenario: User attempts to create an account when the "Allow learners to create accounts" is disabled
    Given the *Allow learners to create accounts* setting is disabled in <facility>
      And I see *Are you a new user?*
    When I click *Create an account*
    Then I see *Select the facility that you want to associate your new account with:*
      And I see a list of facilities on the device
      And I see *Ask your administrator to create an account for these facilities:*
      And I see <facility> is in that list

  Scenario: User changes mind during account creation and wants to sign in to an existing account
    Given *Allow learners to sign in with no password* facility setting is inactive
    When I open Kolibri in the browser
    Then I see *Are you a new user?*
    When I click *Create an account*
    Then I see a list of facilities on the device
    When I click <facility>
    Then I see the *Create an account* form
      And I see <facility> under *Facility*
      And I see *Or sign in with an existing account*
    When I click *Or sign in with an existing account*
    Then I see *Select the facility that has your account*
      And I see a list of facilities on the device
    When I click <facility>
    Then I see *Sign in to <facility>
      And I see a *Change* link button
      And I see a username text field

  Scenario: Learner signs in for the first time in current browser
    Given I am viewing Kolibri for the first time in my current browser
      And I have valid learner account credentials
      And *Allow learners to sign in with no password* facility setting is disabled
    When I open Kolibri in the browser
    Then I see *Sign in if you have an existing account*
    When I click *Sign in*
    Then I see *Select the facility that has your account*
      And I see a list of facilities
    When I click the <facility> associated with my account
    Then I see the username text field
      And I see the password field
    When I enter a valid username
      And I enter a valid password
      And I click *Sign in*
    Then I see the learner landing page

  Scenario: Returning user signs in
  # Use cookies to remember which facility was last signed in to
    Given that the most recent user <username> signed in to <facility> on my browser
      And that <username> has signed out
      And that <username> has closed Kolibri in their browser
    When I open Kolibri in the browser
    Then I see *Sign in to <facility>*
      And I see a *Change* link button
    When I click *Change*
    Then I see *Select the facility that has your account*
      And I see a *Cancel* link button
      And I see a list of facilities on the device
    When I click *Cancel*
    Then I see *Sign in to <facility>*

  Scenario: Username is incorrect
    Given The username <username> does not exist on any facility
    When I enter the invalid username <username> in the username field
      And I enter any invalid password
    When I click *Sign in*
    Then I see *Incorrect username or password*

  Scenario: Password is incorrect
    When I enter a valid <username> in the username field
      And I enter an invalid password
    When I click *Sign in*
    Then I see *Incorrect username or password*

  Scenario: Learner signs in when "Allow learners to sign in with no password" facility setting is active
    Given *Allow learners to sign in with no password* facility setting is enabled
      And I am signing in as a learner
      And I have selected a facility to sign in to
    Then I see the username field
      And I do not see the password field
    When I enter a valid learner username
    When I click *Sign in*
    Then I see the learner landing page
      And I see my username in the app bar

  Scenario: Coach signs in when "Allow learners to sign in with no password" facility setting is active
  # Behavior should also apply for admins and super admins
    Given *Allow learners to sign in with no password* facility setting is active
      And I am signing in as a coach
      And I have selected a facility to sign in to
    Then I see a username field
      And I do not see the password field
    When I enter a valid coach username
      And I click *Sign in*
    Then I see the password field appear
      And I see the password field is autofocused
    When I enter a valid password
      And I click *Sign in*
    Then I see the coach landing page
      And I see my username in the app bar

  Scenario: User attempts to sign in with an invalid username
    Given Facility A does not have a user with the username "fake_user"
      And I am on the username form
    When I enter the username "fake_user"
      And I click *Next*
    Then I see an error under the text input saying "Incorrect username"
      And I remain on the username form
      And the username field is focused and selected

Examples:
| username | facility |
