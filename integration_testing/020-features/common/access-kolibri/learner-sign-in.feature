Feature: Learner sign-in
    Learners need to be able to sign in to access Kolibri
    If the sign in without password setting is enabled, learner needs be able to login only with the username
    If the learner account is registered correctly, they need to arrive at the *Learn > Home* page.

    # scenario valid for 'desktop' mode in all supported operating systems; make sure to separately test the app-mode sign in

  Background:
    Given that I am at the Kolibri sign-in page
      And that there is a registered learner with a password
      And that learner is enrolled in at least one class

    Scenario: Sign-in with a password
      Given I am viewing Kolibri for the first time in my current browser on a single facility device
        And the option *Enter username and password* is selected at *Facility > Settings*
      When I open Kolibri in my browser
      Then I see the Kolibri logo, the name of the facility and a *Username* field
      	And I see a disabled *Next* button
      When I enter my username
      Then the *Next* button becomes enabled
      When I click the *Next* button
      Then I see a *Signing in as '<username>'* text
      	And a *Password* field
      When I enter my password
        And I click the *Sign in* button
      Then I am signed in
      	And I am at the *Learn > Home* page

    Scenario: Sign-in without a password
      Given I am viewing Kolibri for the first time in my current browser on a single facility device
        And the option *Enter username only* is selected at *Facility > Settings*
      When I open Kolibri in my browser
      Then I see the Kolibri logo, the name of the facility and a *Username* field
      	And I see a disabled *Next* button
      When I enter my username
      Then the *Next* button becomes enabled
      When I click the *Next* button
      Then I am signed in and I am at the *Learn > Home* page

    Scenario: Sign-in with a picture password
      Given I am viewing Kolibri for the first time in my current browser on a single facility device
        And the option *Picture password* is selected at *Facility > Settings*
      When I open Kolibri in my browser
      Then I see the Kolibri logo, the name of the facility and 12 child-friendly icons
      	And I see a disabled 3-picture sequence field
      	And I see a disabled right arrow button
      	And I see an *Enter username instead* link
      When I select the correct 3-picture sequence
      Then the right arrow button becomes enabled
      	And I see the 3-picture sequence to the left of it
      When I click the arrow button
      Then I see an *Is this you* confirmation modal
      	And I see my name
      	And I see the 3-picture sequence
      	And I see an *X* button and a green checkmark button
      When I click the green checkmark button
      Then I am signed in
      	And I am at the *Learn > Home* page

    Scenario: Sign-in with a password (multiple facilities)
      Given I am viewing Kolibri for the first time in my current browser on a multi facility device
        And the option *Enter username and password* is selected at *Facility > Settings*
      When I open Kolibri in my browser
      Then I see *Sign in if you have an existing account*
        And I see a *Sign in* button
      When I click the *Sign in* button
      Then I see the list of facilities
      	And I see a *Select the facility that has your account* text
      When I click the <facility> button
        And I enter my username
        And I click the *Next* button
      Then I see *Signing in as '<username>'*
      When I enter my password
        And I click the *Sign in* button
      Then I am signed in
      	And I am at the *Learn > Home* page

    Scenario: Sign-in without a password (multiple facilities)
      Given I am viewing Kolibri for the first time in my current browser on a multi facility device
        And the option *Enter username only* is selected at *Facility > Settings*
      When I open Kolibri in my browser
      Then I see *Sign in if you have an existing account*
        And I see a *Sign in* button
      When I click the *Sign in* button
      Then I see the list of facilities
      When I click the <facility> button
        And I enter my username
        And I click the *Next* button
      Then I am signed in
      	And I am at the *Learn > Home* page

    Scenario: Sign-in with a picture password (multiple facilities)
      Given I am viewing Kolibri for the first time in my current browser on a multi facility device
        And the option *Picture password* is selected at *Facility > Settings*
      When I open Kolibri in my browser
      Then I see *Sign in if you have an existing account*
        And I see a *Sign in* button
      When I click the *Sign in* button
      Then I see the list of facilities
      When I click the <facility> button
      Then I see the Kolibri logo, the name of the facility and 12 child-friendly icons
      	And I see a disabled 3-picture sequence field
      	And I see a disabled right arrow button
      	And I see an *Enter username instead* link
      When I select the correct 3-picture sequence
      Then the right arrow button becomes enabled
      	And I see the 3-picture sequence to the left of it
      When I click the arrow button
      Then I see an *Is this you* confirmation modal
      	And I see my name
      	And I see the 3-picture sequence
      	And I see an *X* button and a green checkmark button
      When I click the green checkmark button
      Then I am signed in
      	And I am at the *Learn > Home* page

    Scenario: Sign-in with a password (multiple facilities, subsequent session)
      Given I am viewing Kolibri for a subsequent time in my current browser on a multi facility device
        And the option *Enter username and password* is selected at *Facility > Settings*
      When I open Kolibri in my browser
      Then I see the '<facility>' name with a back arrow to the left of it
        And I see the username input field below it
      When I enter my username
      Then I see *Signing in as '<username>'*
        And I see the password field
      When I type in my password
        And I click on *Sign in*
      Then I am signed in
      	And I am at the *Learn > Home* page

    Scenario: Sign-in without a password (multiple facilities, subsequent session)
      Given I am viewing Kolibri for a subsequent time in my current browser on a multi facility device
        And the option *Enter username only* is selected at *Facility > Settings*
      When I open Kolibri in my browser
      Then I see the '<facility>' name with a back arrow to the left of it
        And I see the username input field below it
      When I enter my username
      	And I click on *Next*
      Then I am signed in
      	And I am at the *Learn > Home* page

    Scenario: Sign-in with a picture password ((multiple facilities, subsequent session)
      Given I am viewing Kolibri for a subsequent time in my current browser on a multi facility device
        And the option *Picture password* is selected at *Facility > Settings*
      When I open Kolibri in my browser
      Then I see the '<facility>' name with a back arrow to the left of it
      	And I see the 12 child-friendly icons
      	And I see a disabled 3-picture sequence field
      	And I see a disabled right arrow button
      	And I see an *Enter username instead* link
      When I select the correct 3-picture sequence
      Then the right arrow button becomes enabled
      	And I see the 3-picture sequence to the left of it
      When I click the arrow button
      Then I see an *Is this you* confirmation modal
      	And I see my name
      	And I see the 3-picture sequence
      	And I see an *X* button and a green checkmark button
      When I click the green checkmark button
      Then I am signed in
      	And I am at the *Learn > Home* page

   	Scenario: Password creation for a learner account created without a password
      Given the option *Enter username and password* is selected at *Facility > Settings*
        And I have a learner account which was created without a password (or with only a picture password)
      When I open Kolibri in my browser
        And I enter my username
        And I click the *Next* button
      Then I see *Hi, <Full name>. You need to set a new password for your account.*
        And I see the input fields to type a new password and re-enter the same password
      When I fill in both fields
        And I click *Continue*
      Then I am signed in
      	And I am at the *Learn > Home* page
