Feature: Super admin searches for users
  Super admin needs to be able to search for and find users 

  # Make sure you have many users in the facility (import from the CSV file, or use the `manage generateusers` command), to be able to test the pagination

  # Repeat the scenarios with a RTL language to make sure the orientation is correct

  Background:
    Given I am signed in to Kolibri as super admin
      And I am on *Facility > Users* page
      And there are more than 150 users in the facility

  Scenario: Search by navigating pages
    When I click the right arrow (next page) button
    Then I am on the second page of the list of facility users
    When I click the left arrow (previous page) button
    Then I am back on the first page of the list of facility users
    When I keep clicking the right arrow to find a user
    Then I see the numbers of pages correctly increasing in increments of 10 # or 30, if the number of users is close to 1000

  Scenario: Search for and find user using the search field
    When I click or tab into the search field
      And I start writing the user's <full_name> or <username>
    Then I see the list of users below is being filtered according to the characters I write
      And I see the number of pages decreasing accordingly 
    When I write enough characters for all other users to be excluded
    Then I see just the user I was searching for

  Scenario: Clear search 
    Given that I wrote user's <username> in the search field
      And I see the filtered results
      And I see the number of pages as '1 of 1'
    When I click the clear *X* button, OR tab to focus it and press Enter, OR I delete what I wrote
    Then I see the full (unfiltered) list of users
      And I see the full number of pages

  Scenario: Search for and find user using the role dropdown filter
    When I click to open the *User type* filter
      And I select the role <role>
    Then in the list bellow I see just the users with the role <role>
      And I see the number of pages decreased accordingly 
      But I don't see any other user type
    When I click or tab into the search field to further filter the results
      And I start writing the user's <full_name> or <username>
    Then I see the list of users below is being filtered according to the characters I write
      And I see the number of pages decreasing accordingly 
    When I write enough characters for all other users to be excluded
    Then I see just the user I was searching for
      And I see the number of pages as '1 of 1'

Examples:
| full_name | username | role     |
| Pinco P.  | coach    | Coaches  |
| John C.   | learner  | Learners |
| Carrie W. | admin2   | Admins   |
