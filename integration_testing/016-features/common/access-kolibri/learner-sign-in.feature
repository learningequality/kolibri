Feature: Learner sign-in
    Learners need to be able to sign in to access Kolibri
    If the sign in without password setting is enabled, learner needs be able to login only with the username
    If the learner account is registered correctly, they need to arrive at the *Learn > Home* page.

    # scenario valid for 'desktop' mode in all supported operating systems; make sure to separately test the app-mode sign in

  Background:
    Given that I am at the Kolibri sign-in page
      And that there is a registered learner <username> with password <password>
      And that learner <username> is enrolled in one or more classes

    Scenario: Sign-in with a password
      Given I am viewing Kolibri for the first time in my current browser on a single facility device
        And the option *Require password for learners* is checked in the *Facility Settings*
      When I open Kolibri in my browser
      Then I see *Sign in if you have an existing account*
        And I see a *Sign in* button
      When I fill in my username <username>
        And I click the *Next* button
      Then I see *Signing in as '<username>'*
      When I fill in my password <password>
        And I click the *Sign in* button
      Then I am signed in and I am at the *Learn > Home* page

    Scenario: Sign-in without a password
      Given I am viewing Kolibri for the first time in my current browser on a single facility device
        And the option *Require password for learners* is unchecked in the *Facility Settings*
      When I open Kolibri in my browser
      Then I see *Sign in if you have an existing account*
        And I see a *Sign in* button
      When I fill in my username <username>
        And I click the *Next* button
      Then I am signed in and I am at the *Learn > Home* page

    Scenario: Sign-in with a password (multiple facilities)
      Given I am viewing Kolibri for the first time in my current browser on a multi facility device
        And the option *Require password for learners* is checked in the *Facility Settings*
      When I open Kolibri in my browser
      Then I see *Sign in if you have an existing account*
        And I see a *Sign in* button
      When I click the *Sign in* button
      Then I see the list of facilities
      When I click the <facility> button
        And I fill in my username <username>
        And I click the *Next* button
      Then I see *Signing in to '<facility>' as '<username>'*
      When I fill out my password <password>
        And I click the *Sign in* button
      Then I am signed in and I am at the *Learn > Home* page

    Scenario: Sign-in without a password (multiple facilities)
      Given I am viewing Kolibri for the first time in my current browser on a multi facility device
        And the option *Require password for learners* is unchecked in the *Facility Settings*
      When I open Kolibri in my browser
      Then I see *Sign in if you have an existing account*
        And I see a *Sign in* button
      When I click the *Sign in* button
      Then I see the list of facilities
      When I click the <facility> button
        And I fill in my username <username>
        And I click the *Next* button
      Then I am signed in and I am at the *Learn > Home* page

    Scenario: Sign-in with a password (multiple facilities, subsequent session)
      Given I am viewing Kolibri for a subsequent time in my current browser on a multi facility device
        And the option *Require password for learners* is checked in the *Facility Settings*
      When I open Kolibri in my browser
      Then I see *Sign into '<facility>'*
        And I see the username input field below
        And I see the *Change facility* link above
      When I fill in my username <username>
      Then I see *Signing into '<facility>' as '<username>'*
        And I see the input field for entering my password
      When I type in my password
        And I click on *Sign in*
      Then I am signed in and I am at the *Learn > Home* page

    Scenario: Sign-in without a password (multiple facilities, subsequent session)
      Given I am viewing Kolibri for a subsequent time in my current browser on a multi facility device
        And the option *Require password for learners* is unchecked in the *Facility Settings*
      When I open Kolibri in my browser
      Then I see *Sign into '<facility>'*
        And I see the username input field below
        And I see the *Change facility* link above
      When I fill out my username <username>
        And I click on the *Next* button
      Then I am signed in and I am at the *Learn > Home* page

    Scenario: User changes their mind or makes errors during sign-in
      Given the user is on the password input step, but sees a wrong username or facility
      When I see *Signing in to '<facility>' as '<username>'*
        And the <username> is not my own and I need to change it
      Then I click the *Change user* link
        And I see the username input field again
      When I see *Sign into '<facility>'*
        But <facility> is not the one I need to sign in to
      Then I click the *Change facility* link
        And I see the list of facilities again

    Scenario: No facility name on the sign in page if there is only one facility on the device and the use context is personal (no password)
      Given I have a Kolibri account
        And there is only one facility on the device
        And the use context is personal
      When I open Kolibri in my browser
      Then see the input field for entering my username
        And I see the *Sign in* button
        And I see a *Create an account* button
        And I see a *Explore without account* link
          But I don't see any facility name displayed in the sign in container box
      When I type in my username
        And I click on the *Sign in* button
      Then I am signed in and I am at the *Learn > Home* page

    Scenario: Facility name is displayed on the sign in page if there is only 1 facility on the device and the use context is formal or non formal (no password)
      Given I have a Kolibri account
        And there is only one facility on the device
        And the use context is formal or non formal
      When I open Kolibri in my browser
      Then I see *Sign into '<facility>'*
        And see the input field for entering my username
        And I see the *Sign in* button
        And I see a *Create an account* button
        And I see a *Explore without account* link
      When I type in my username
        And I click on the *Sign in* button
      Then I am signed in and I am at the *Learn > Home* page

    Scenario: Password creation for learners who did not set one when their account was created
        Given the option *Require password for learners* is checked in the *Facility Settings*
          And I have a learner account previously created without a password
        When I open Kolibri in my browser
          And I type my username
        Then I see a notification that I must select a password
          And I see the input fields to type a new password and re-enter the same password
        When I type my password
          And I click *Continue*
        Then I am signed in and I am at the *Learn > Home* page
