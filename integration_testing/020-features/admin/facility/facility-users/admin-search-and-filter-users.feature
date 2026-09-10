Feature: Admin can search for a user or filter the users
  Admin users need to be able to search for and filter users

  # Make sure you have many users in the facility (import from the CSV file, or use the `manage generateusers` command), to be able to test the pagination

  # Repeat the scenarios with a RTL language to make sure the orientation is correct

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am at the *Facility > Users* page
      And there are more than 150 users of different type in the facility

  Scenario: Search for and find a user using the search field
    When I click or tab into the search field
      And I start typing the user's full name or username
    Then I see that the list of users below is being filtered corresponding to the typed characters
      And I see the number of pages decreasing accordingly
    When I've typed enough characters for all the other users to be excluded
    Then I see only the user matching the typed full name or username

  Scenario: Search for a user that doesn't exist
    When I click or tab into the search field
      And I start typing the user's full name or username of a user that doesn't exist
    Then I see only the following text: *No users match this search*

  Scenario: Clear search
    Given that I've entered the user's name or username in the search field
      And I see the filtered results
      And I see the number of pages as '1 of 1'
    When I click the clear *X* button #or tab to focus it and press Enter, or I delete what I wrote
    Then I see the full (unfiltered) list of users
      And I see the full number of pages

  Scenario: Search for and find a user using the user filter
    When I click on the *Filter* link
    Then I see the *Filter users* side panel
    	And I see sections for the following filters: User type, Class and Birth year
    When I select any of the available options
    	And I click the *Apply filters* button
    Then I see only users matching the applied filters
    	And I see an *N filters* link
    	And I see a *Clear filters* link
    When I click the *Clear filters* link
    Then I see the full (unfiltered) list of users
      And I see the full number of pages

  Scenario: Search by navigating pages
    When I click the right arrow (next page) button
    Then I am on the second page of the list of facility users
    When I click the left arrow (previous page) button
    Then I am back on the first page of the list of facility users
    When I keep clicking the right arrow to find a user
    Then I see the numbers of pages correctly increasing in increments of 10 # or 30, if the number of users is close to 1000
