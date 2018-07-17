Feature: Learner sign-out
    Learners need to be able to sign out when finished using Kolibri
    Also important for correct progress tracking of individual learners

  Background:
    Given that you are signed in to Kolibri

  Scenario: Sign-out from user menu
    When you select the user menu in the top right hand corner
    When you click the *Sign out* button 
    Then You should be signed out and back on the sign-in page

  Scenario: Sign-out from sidebar
    When you open the sidebar from the top left icon
    When you click the *Sign out* button 
    Then You should be signed out and back on the sign-in page