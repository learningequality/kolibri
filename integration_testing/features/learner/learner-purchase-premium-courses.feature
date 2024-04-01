Feature: Learner purchases a premium course using the payment system
Learners can purchase premium courses through an integrated payment system.

Background:
Given I am signed in as a learner user
And I have a valid payment method added to my account
And I am on the Courses page with premium content available for purchase

Scenario: Browse and select a premium course
When I am on the Courses page
Then I see a list of courses including both free and premium options
When I select a premium course <course_name>
Then I see the course description, price, and a Purchase button

Scenario: Initiate the purchase process
Given I have selected a premium course <course_name>
When I click the Purchase button
Then I am directed to the payment gateway page
And I see the course name, price, and payment options

Scenario: Complete the purchase
When I enter my payment details
And I click the Pay button
Then I see a payment confirmation message
And I am redirected to the course page
And I have full access to the <course_name> content

Scenario: Handle payment failure
When I enter incorrect payment details
And I click the Pay button
Then I see an error message indicating the payment failure
And I am given the option to try again or change the payment method

