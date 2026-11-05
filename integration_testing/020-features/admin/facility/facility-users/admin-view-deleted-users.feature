Feature: Admin manages deleted users
  Admin users need to be able to manage the deleted users

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am at *Facility > Users > Deleted users* page
      And there are several deleted users of different types
      And there are users who have been assigned to or enrolled in a class

  Scenario: Recover a deleted user who was assigned to or enrolled in a class
    When I look at the *Deleted users* page
    Then I see a *Deleted users* label
    	And I see the disabled *Recover* and *Delete permanently* icons
      And I see the *Search for a user* field and a *Filter* link
      And I see the deleted users table with the *Full name*, *Username*, *Identifier*, *Gender*, *Birth year* and *Permanent deletion* columns
    When I select a user
    Then I see that both the *Recover* and *Delete permanently* icons become enabled
    	And I see *1 user selected* text and a *Clear selection* link
    When I click the *Recover* icon
    Then I see a *1 user recovered* snackbar message
    	And the user is no longer listed in the *Deleted users* table
    When I go back to the *Facility > Users* page
    Then I can see that the recovered user is listed in the *Users* table
    When I go to *Facility > Classes*
    Then I can see that the user is either enrolled in or assigned to a class #depending on the user's role
    When I sign in to Kolibri as the recovered user
    Then I can see that all my previous data and interactions are kept in the state they were before the removal of the user

  Scenario: Recover multiple deleted users simultaneously
    When I select several users
    Then I see that both the *Recover* and *Delete permanently* icons become enabled
    	And I see an *N users selected* text and a *Clear* link
    When I click the *Recover* icon
    Then I see an *N user recovered* snackbar message
    	And the users are no longer listed in the *Deleted users* table
    When I go back to the *Facility > Users* page
    Then I can see that the recovered users are listed in the *Users* table
    When I go to *Facility > Classes*
    Then I can see that the users are either enrolled in or assigned to a class (or several classes) #depending on the user's role
    When I sign in to Kolibri as any of the recovered users
    Then I can see that all my previous data and interactions are kept in the state they were before the removal of the user

  Scenario: Permanently delete users
    When I select one or several users
    Then I see that both the *Recover* and *Delete permanently* icons become enabled
    	And I see an *N users selected* text and a *Clear* link
    When I click the *Delete permanently* icon
    Then I see a *Delete selected?* confirmation modal
    When I click the red *Delete* button
    Then I see a *Selected users deleted* snackbar message
    	And the users are no longer listed in the *Deleted users* table
    When I go back to the *Facility > Users* page
    Then I can see that the deleted users are also not listed in the *Users* table
    When I go to *Facility > Classes*
    Then I can see that the users are not enrolled in or assigned to a class (or several classes) #depending on the user's role
    When I attempt to sign in to Kolibri as any of the deleted users
    Then I can see that this is no longer possible
