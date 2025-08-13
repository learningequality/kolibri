Feature: Coach changes profile information
  Coach needs to be able to change their own profile information

  Background:
    Given I am signed in to Kolibri as a coach user
      And I am at the *Profile* page

  Scenario: Coach changes profile info
    When I click the *Edit* button
    Then I see the *Edit profile* page
    When I modify any of the available fields (*Full name*,*Username*,*Gender*,*Birth year*)
      And I click the *Save* button
    Then I see the *Changes saved* snackbar notification
    	And I am back at the *Profile* page
    	And I see the applied changes

  Scenario: Coach changes password
    When I click the *Change password* link
    Then I see the *Change password* modal
    When I enter a new password
      And I re-enter the new password
      And I click the *Update* button
    Then I see the *Your password has been changed* snackbar notification
    	And I am back at the *Profile* page
