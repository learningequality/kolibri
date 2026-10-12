Feature: Admin can view and manage the new users
  Admin users need to be able to view the new users, create user accounts for each role in the facility and edit the new user accounts

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am at *Facility > Users* page
      And there are several newly created users of type coach, facility coach, and admin

  Scenario: View the new users
    When I click the *Options* button
    	And I select the *View new users* option
    Then I see the *New users* page
      And I see a *New user* button
      And I see the *Assign coach*, *Enroll in class*, *Remove from class* and *Delete selected* icons
      And I see the *Search for a user* field
      And I see a *Filter* link
      And I see the user's table with the *Full name*, *Username*, *Identifier*, *Gender*, *Birth year* and *Created at* columns
      And I see only the new users created within a month from the current date

  # Execute the rest of the scenarios available for user management at *Facility > Users*
