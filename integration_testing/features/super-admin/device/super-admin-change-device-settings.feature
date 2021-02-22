Feature: Super admin changes device settings
  Super admin needs to be able to change settings related to access to resources, unlisted channels and the default landing page
  Background:
    Given I am signed in to Kolibri as super admin user
      And I am on *Device > Settings* page
      And there are learner and coach user accounts created in the facility
      And a channel has been imported from Kolibri Studio using a token
      And there is another Kolibri instance on my network

  Scenario: Allow guest browsing
    Given the *Allow users to access resources without signing in* checkbox is unchecked
      And the *Landing page* option is set to the *Sign-in page*
      And the *Learners should only see resources assigned to them in classes* is unchecked
    When I check the *Allow users to access resources without signing in* checkbox
    Then I see that the *Learners should only see resources assigned to them in classes* options is disabled (grayed out)
    When I click the *Save* button
      And I sign out
    Then I see the *Explore without account* link on the sign-in page
    When I click *Continues as a guest*
    Then I see the *Learn > Channels* page

  Scenario: The landing page is the learn page
    Given the *Allow users to access resources without signing in* checkbox is unchecked
      And the *Landing page* option is set to the *Sign-in page*
      And the *Learners should only see resources assigned to them in classes* is unchecked
    When I select *Learn page* for the *Landing page*
    Then I see that both the *Allow users to access resources without signing in* and *Learners should only see resources assigned to them in classes* options are disabled (grayed out)
    When I click the *Save* button
      And I sign out
    Then I see immediately see the *Learn > Channels* page
    When I sign-in as learner <username>
    Then I see *Learn > Channels* page again

  Scenario: Learners can only access assigned resources
    Given the *Learners should only see resources assigned to them in classes* is unchecked
      And the *Landing page* option is set to the *Sign-in page*
      And the *Allow users to access resources without signing in* checkbox is unchecked
    When I check the *Learners should only see resources assigned to them in classes* checkbox
      And I click the *Save* button
      And I sign out
    Then I do not see the *Continues as a guest* link on the sign-in page
    When I sign-in as learner <username>
    Then I see the *Learn > Classes* page
      And I do not see the *Channels* or *Recommended* tabs

Examples:
| full_name | username | password |
| John C.   | learner  | learner  |
