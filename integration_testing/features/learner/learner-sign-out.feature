Feature: Learner sign-out
    Learners need to be able to sign out when finished using Kolibri
    Also important for correct progress tracking of individual learners

  Background:
    Given that I am signed in to Kolibri as a learner user

  Scenario: Sign-out from user menu
    When I select the user menu in the top right hand corner
      And I click the *Sign out* button 
    Then I am signed out and back on the sign-in page

  Scenario: Sign-out from sidebar
    When I open the sidebar from the top left icon
      And I click the *Sign out* button 
    Then I am signed out and back on the sign-in page
    