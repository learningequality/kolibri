Feature: Coach creates quizzes
  Coach needs to be able to create quizzes from existing content

  Background:
    Given I am signed in to Kolibri as a coach user
      And I am on the *Coach - '<class>' > Plan > Quizzes* page

  Scenario: Create new quiz
    When I click the *New quiz* button
    Then I see a new *Create new quiz* page
      And I see empty *Title* field, and the default value of 10 in the *Number of questions* field
      And I see a list of channels that contain exercises
        But I don't see any checkboxes

  # Given there are no channels that have exercises
  # Then there should not be any channels available to select
  Scenario: Try and fail to create new quiz when no channel on device contains exercises
    When I click the *New quiz* button
    Then I see a new *Create new quiz* page
      And I see empty *Title* and *Number of questions* fields
      But I don't see any channels

  Scenario: Check validation for the number of questions field
    When I input a number outside the range of 1-50
      And I leave the input field or attempt to continue or finish the quiz
    Then the input field has the red outline
    When I input a number greater than amount of exercise questions
      And I leave the input field or attempt to continue or finish the quiz
    Then the number is cut out at 50
    When I don't input anything into the number field
      And I leave the input field or attempt to continue or finish the quiz
    Then an input validation error appears
    When I input a valid number
    Then I don't see the validation error anymore

  Scenario: Check validation when no exercises are selected
    When I don't select any exercises
    Then I see “No exercises are selected” error message

  Scenario: Navigate resources
    When I click on a channel or topic card
    Then I see channel/topic resources
      And I see the breadcrumb path for the channel/topic
    When I click on a parent topic breadcrumb
    Then I am redirected back to that topic
    When I click on the *Channels* breadcrumb
    Then I am redirected back to the list of *Channels* under *Select topics or exercises*

  Scenario: Select resources from a topic
    When I check an unselected topic card checkbox
    Then I see that all the exercise descendants are selected (*n of n resources selected*)
      And I see a snackbar confirmation
    When I click the topic card of the selected topic
    Then I see the *Select all* checkbox is selected
      And I see that all its content is selected
    When I uncheck an exercise or a topic
      And I navigate back to the parent topic node
    Then I see the checkbox changed to partial (*-*) state

  Scenario: Select and remove resources from a topic
    When I uncheck fully selected topic card checkbox
    Then I see that none of the exercise descendants are selected
      And I see a snackbar confirmation

  Scenario: Select and remove a single exercise
    When I check an unselected exercise card checkbox
    Then I see a snackbar confirmation
    When I uncheck a selected exercise card checkbox
    Then I see a snackbar confirmation

  Scenario: Use the *Select all* checkbox
    Given that the *Select all* checkbox is unchecked
      When I check the *Select all* checkbox
      Then I see a snackbar confirming the topic was added
      When I uncheck the *Select all* checkbox
      Then I see a snackbar confirming the topic was removed

  Scenario: Preview an added exercise card
    When I click on a previously added exercise card
    Then I am redirected to the exercise preview
      And I see the *Added* indicator
      And I see the *Remove* button
      And see properly rendered questions and the correct answers

  Scenario: Preview a non selected exercise card
    When I click on a an exercise card non previously selected
    Then I am redirected to the exercise preview
      And I see the *Add* button
      And see properly rendered questions and the correct answers

  Scenario: Search and find by keyword
    When I enter a keyword into the search box
      And I click the search icon button or press Enter
    Then I am redirected to the search results page
      And I see topic and/or exercise cards on the search results page

  Scenario: Fail to find by keyword
    When I enter a keyword into the search box
      And I click the search icon button or press Enter
    Then I am redirected to the search results page
      And I see the *No results for...* message

  Scenario: Clear results and reset search
    Given that there are results from the previous search
    When I press the *X* button in the search field
      Or I delete the previous search term and press *Enter*
    Then I see the list of all *Channels* with exercises under *Select topics or exercises* again

  Scenario: Add a topic or exercise from the search results page
    Given I am on the search results page
      And there are exercises and topics available in the search results
    When I check an exercise checkbox
    Then I see the *n of n selected* indicator
      And I see a snackbar confirmation that the exercise was added to the quiz
    When I check a topic checkbox
    Then I see the *n of n selected* count increase for the number of exercises in the selected topic
      And I see a snackbar confirmation that the topic was added to the quiz

  Scenario: Remove a topic or exercise from the search results page
    Given I am on the search results page
      And there are exercises and topics available in the search results
      And some of them are selected
    When I uncheck an exercise checkbox
    Then I see the *n of n selected* count decrease by 1
      And I see a snackbar confirmation that the exercise was removed from the quiz
    When I uncheck a topic checkbox
    Then I see the *n of n selected* count decrease for the number of exercises in the removed topic
      And I see a snackbar confirmation that the topic was removed from the quiz

  Scenario: Filter search results by type
    Given I am on the search results page
      When I open the *Type* filter dropdown
      Then I can see the available formats I can filter by (all/exercises/topics)
      When I select *Exercises* option
      Then I see only exercises among search results
      When I select *Topics* option
      Then I see only topics among search results
      When I select the option *All*
      Then I see both topics and exercises in search results

  Scenario: Use the channel filter
    Given I am on the search results page
      And I see content from channels related to the searched keyword
      And I don't see content from channels that do not contain exercises
    When I select a specific channel from the channel filter dropdown
    Then I see the search results are filtered and present content only from the selected channel
    When I select *All* in the filter dropdown
    Then I see that results are not filtered anymore

  Scenario: Filter coach content in and out
    Given I am on the search results page
      When I select *Coach* filter option
      Then I see the search results are filtered and present only content for coaches
      When I select *Non-coach* filter option
      Then I see the search results are filtered and exclude content for coaches
      When I select the *All* filter option
      Then I see the search results include both coach and non-coach content

  Scenario: View metadata on exercise cards in search results
    Given I am on the search results page
      And there are exercises in the search results
    When I see an exercise card
    Then I see its title
      And I see its description
      And I see whether it is a coach exercise or not

  Scenario: View metadata on topic cards in search results
    Given I am on the search results page
      And there are topics in the search results
    When I see a topic card
    Then I see its title
      And I see its description
      And I see how many coach exercises/topics it contains
      And I see how many exercises inside are added to the quiz

  Scenario: Preview a resource in the search results
    Given I am on the search results page
      And there are exercises in the search results page
    When I click an exercise <exercise> card
    Then I am on the preview page for exercise <exercise>
    When I click the *back arrow* button
    Then I see the search results page again
      And I see my results are still present

  Scenario: Exit the search results page
    Given I am on the search results page
      When I click *Exit search*
      Then I see the *Create new quiz* page again

  Scenario: Preview quiz and change the question order
    Given I am on *Create new quiz* page
      And there are no validation errors
    When I click “Continue”
    Then I see a *Preview quiz* page 
      And I see the *Question order* is by default *Randomized*, with a questions displayed as a list pulled randomly from selected exercises
    When I select *Fixed* radio button
    Then I see the order of questions is refreshed, and questions are displayed as a numbered list.

  Scenario: Check validation for the title field
    When I try to enter a name with more than 100 characters
    Then I see that the title is cut at 100
    When I input a quiz title same as for an already existing quiz
    Then I see the error notification *A quiz with that name already exists* 
    When I leave the name field empty
      And I click *Finish*
    Then I see the error notification *This field is required*
    When I input a valid title into the field
      And I click *Finish*
    Then I don't see the validation error anymore
      And I see the quiz on the list at *Coach - '<class>' > Plan > Quizzes* tab 

  Scenario: Save quiz
    Given I am on quiz preview page
      And there are no validation errors
    When I click “Finish”
    Then I am redirected to the *Coach - '<class>' > Plan > Quizzes* page
      And I see a snackbar confirmation that the quiz is created

  Scenario: Exit quiz creation without finishing
    Given I am on *Create new quiz* page
      But I did not save the quiz
    When I click the *back arrow* button
    Then I am redirected to the *Coach - '<class>' > Plan > Quizzes* page
      And I loose all quiz creation progress

Examples:
  | quiz          | number_of_question | exercises_questions | channel                | topic               |
  | First Quarter | 5                  | Mathématiques       | Khan Academy (English) | Recognize fractions |
