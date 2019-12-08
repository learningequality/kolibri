Feature: Learners can see a notification if their profile needs to be updated

  Background:
    Given the version of Kolibri is at least 0.13, and birth year, id number, and gender are part of a user's profile
      And I have a Learner (or higher) account

    Scenario: Admin-created users see a notification if demographic info was not provided
      Given my account was created after the upgrade to 0.13
        And the admin who created my account did not provide either my birth year or gender
      When I log in for the first time
      Then the *update your profile* modal appears

    # this should go to guest scenario; do not test
    Scenario: Accounts created on *Sign Up Page* never see a notification
      Given I do not have an account
        And I am on the Sign Up Page
      When I provide my birth year or gender (or not)
        And I complete the account creation workflow
      Then I am redirected to the *Learn* page
        And the *update your profile* modal does not appear

    # this should go to super-user scenario; do not test
    Scenario: Accounts created in *Setup Wizard* never see a notification
      Given I do not have an account
        And I am on the *Setup Wizard > Superuser Credentials* step
      When I provide my birth year or gender (or not)
        And I complete the Setup Wizard
        And I navigate to the *Learn* page
        And the *update your profile* modal does not appear

    # test this only on upgrade workflow (from Kolibri > 0.13 to 0.13)
    Scenario: Pre-upgrade accounts see a notification on first post-upgrade login
      Given I am user of any type
        And My account was created before the upgrade to 0.13
        And I have not logged in since the upgrade
      When I log in
        And Navigate to the *Learn* page
      Then the *update your profile* modal appears

    Scenario: I can go to my profile page from the modal
      Given I see the *update your profile* notification modal
      When I click the *Edit profile* button
      Then I am redirected to the *Edit Profile Page*
        And the *Gender* dropdown is empty
        And the *Birth year* dropdown is empty
      When I fill out the gender and birth year and save (or not)
       And I navigate back to the *Learn* page
      Then the *update your profile* modal does not appear

    Scenario: Dismissing the *update your profile* is permanent
      Given I see the *Update your profile* notification modal
      When I click the *Cancel* button
      Then the notification modal disappears
      When I refresh my browser
      Then the *update your profile* modal does not appear

  Examples:
  | username | password |
  | learner  | learner  |