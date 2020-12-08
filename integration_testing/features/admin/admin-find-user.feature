Feature: Admin find users
  Admin needs to be able to search for and find users

  # Make sure you have many users in the facility (import from the CSV file, or use the `manage generateusers` command), to be able to test the pagination

  # Repeat the scenarios with a RTL language to make sure the orientation is correct

  Background:
    Given The user is signed in to Kolibri as a facility admin user
      And The user is on *Facility > Users* page
      And There are more than 150 users in the facility

  Scenario: Search by navigating pages
    When The user clicks the right arrow (next page) button
    Then The user is on the second page of the list of facility users
    When The user clicks the left arrow (previous page) button
    Then The user is back on the first page of the list of facility users
    When The user keeps clicking the right arrow to find a Kolibri user
    Then The user sees the numbers of pages correctly increasing in increments of 10 # or 30, if th enumber of users is close to 1000

  Scenario: Search for and find user using the search field
    When The user clicks or tabs into the search field
      And The user starts writing the Kolibri user's <full_name> or <username>
    Then The user sees the list of Kolibri users below is being filtered according to the characters written
      And The user sees the number of pages decreasing accordingly
    When The user writes enough characters for all other Kolibri users to be excluded
    Then The user sees just the Kolibri user he/she was searching for

  Scenario: Clear search
    Given That the user has written Kolibri user's <username> in the search field
      And The user sees the filtered results
      And The user sees the number of pages as '1 of 1'
    When The user clicks the clear *X* button, OR tabs to focus it and presses Enter, OR deletes what he/she has written
    Then The user sees the full (unfiltered) list of Kolibri users
      And The user sees the full number of pages

  Scenario: Search for and find user using the role dropdown filter
    When The user clicks to open the *User type* filter
      And The user selects the role <role>
    Then In the list bellow the user sees just the Kolibri users with the role <role>
      And The user sees the number of pages decreased accordingly
      But The user doesn't see any other user type
    When The user clicks or tabs into the search field to further filter the results
      And The user starts writing the Kolibri user's <full_name> or <username>
    Then The user sees the list of Kolibri users below is being filtered according to the characters he/she writes
      And The user sees the number of pages decreasing accordingly
    When The user writes enough characters for all other users to be excluded
    Then The user sees just the Kolibri user he/she was searching for
      And The user sees the number of pages as '1 of 1'

Examples:
| full_name | username | role     |
| Pinco P.  | coach    | Coaches  |
| John C.   | learner  | Learners |
| Carrie W. | admin2   | Admins   |
