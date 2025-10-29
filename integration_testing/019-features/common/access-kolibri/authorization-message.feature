Feature: Authorization message
  Unauthorized users see a message

  Scenario: Seeing message as an anonymous user
    Given that I am an anonymous user
    When I attempt to access a restricted page
    Then I see an Authorization Message
      And there is a link that says *Sign In to Kolibri*

  Scenario: Seeing message as authenticated but not authorized user
    Given that I am logged in as an authenticated user
    When I attempt to access a restricted page
    Then I see an Authorization Message
      And there is not a link that says *Sign In to Kolibri*

  Scenario: Getting redirected after signing in
    Given that I am on a restricted page
      And I see an Authorization Message
    When I click the *Sign In to Kolibri* link
    Then I am taken to the Sign In Page
    When I provide credentials for an authorized user
    Then I am taken back to the original restricted page
      And I do not see an Authorization Message
