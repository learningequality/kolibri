Feature: Super admin searches for users
    Super admin needs to be able to search for and find users 

  Background:
    Given I am signed in to Kolibri as super admin
      And I am on *Facility > Users* page

  Scenario: Search for and find user using the search field
    When I click or tab into the search field
      And I start writing the user's <full_name> or <username>
    Then I see the list of users below is being filtered according to the characters I write
    When I write enough characters for all other users to be excluded
    Then I see just the user I was searching for

  Scenario: Clear search 
    Given that I wrote user's <username> in the seach field
      And I see the filtered results
      When I click the clear *X* button, OR tab to focus it and press Enter, OR I delete what I wrote
      Then I see the full (unfiltered) list of users

  Scenario: Search for and find user using the role dropdown filter
    When I click to open the *User type* filter
      And I select the role <role>
    Then in the list bellow I see just the users with the role <role>
      But I don't see any other user type
    When I click or tab into the search field to further filter the results
      And I start writing the user's <full_name> or <username>
    Then I see the list of users below is being filtered according to the characters I write
    When I write enough characters for all other users to be excluded
    Then I see just the user I was searching for

Examples:
| full_name | username | role     |
| Pinco P.  | coach    | Coaches  |
| John C.   | learner  | Learners |
| Carrie W. | admin2   | Admins   |