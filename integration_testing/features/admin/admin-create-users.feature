Feature: Admin creates users
  Admin needs to be able to create user accounts for each role in the facility

  Background:
    Given The user is signed in to Kolibri as facility admin user
      And The user is on *Facility > Users* page

  Scenario: Create facility coach user account
    When The user clicks on *New user* button
    Then The user sees *Create new user* page
    When The user enters user's full name <full_name>
      And The user enters the username <username>
      And The user enters the password <password>
      And The user re-enters the password <password>
      And The user selects *Coach* for the *User type*
    Then The user sees the coach type options appear bellow
    When The user selects *Facility coach* option
      And The user enters *Identifier* if desired
      And The user selects *Gender* and *Birth year* if desired
      And The user clicks *Save* button
    Then The page reloads
      And The user sees the the snackbar confirmation that the user has been created
      And The user sees the new user on the *Facility > Users* page
      And The user sees the *Facility coach* label besides their name

  Scenario: Create class coach user account
    When The user clicks on *New user* button
    Then The user sees *Create new user* page
    When The user enters user's full name <full_name>
      And The user enters the username <username>
      And The user enters the password <password>
      And The user re-enters the password <password>
      And The user selects *Coach* for the *User type*
    Then The user sees the coach type options appear bellow
    When The user selects *Class coach* option
      And The user enters *Identifier* if desired
      And The user selects *Gender* and *Birth year* if desired
      And The user clicks *Save* button
    Then The page reloads
      And The user sees the the snackbar confirmation that the user has been created
      And The user sees the new user on the *Facility > Users* page
      And The user sees the *Class coach* label besides their name

  Scenario: Create learner user account
    When The user clicks on *New user* button
    Then The user sees *Create new user* page
    When The user enters user's full name <full_name>
      And The user enters the username <username>
      And The user enters the password <password>
      And The user re-enters the password <password>
      And The user selects *Learner* for the *User type*
      And The user enters *Identifier* if desired
      And The user selects *Gender* and *Birth year* if desired
      And The user clicks *Save* button
    Then The page reloads
      And The user sees the the snackbar confirmation that the user has been created
      And The user sees the new learner user on the *Facility > Users* page

  Scenario: Create facility admin user account
    When The user clicks on *New user* button
    Then The user sees *Create new user* page
    When The user enters user's full name <full_name>
      And The user enters the username <username>
      And The user enters the password <password>
      And The user re-enters the password <password>
      And The user selects *Admin* for the *User type*
      And The user enters *Identifier* if desired
      And The user selects *Gender* and *Birth year* if desired
      And The user clicks *Save* button
    Then The page reloads
      And The user sees the snackbar confirmation that the user has been created
      And The user sees the new user on the *Facility > Users* page
      And The user sees the *Admin* label besides their name

Examples:
| full_name | username | password |
| Pinco P.  | coach    | coach    |
| Neela R.  | ccoach   | ccoach   |
| John C.   | learner  | learner  |
| Carrie W. | admin2   | admin2   |
