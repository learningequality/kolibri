Feature: Coach create exams
  Coach needs to be able to create exams from existing content

  Background:
    Given I am signed in to Kolibri as a coach user
    And I am on the *Coach > Exams* page

  Scenario: user clicks on new exam button
    Given I am on the exam list page
    When I click the new exam button
    Then I am redirected to a new page with empty title field and empty number of questions field and 0 initially selected exercises
    And I see a list of channels that contain exercises
    And there should not be any checkboxes
    Given there are no channels that have exercises
    Then there should not be any channels available to select

  Scenario: title input field validation
    Given I have not inputted an exam title
    And I leave the input field or attempt to preview or save the exam
    Then an input validation error should appear for the title field
    Given a valid title has been inputted into the field
    Then there should not be a validation error for the title field

  Scenario: number of questions field validation
    Given I have inputted a number outside the range of 1-50
    And I leave the input field or attempt to preview or save the exam
    Then an input validation error should appear for the question field
    Given I have inputted a number greater than amount of exercise questions available
    And I leave the input field or attempt to preview or save the exam
    Then an input validation error should appear for the question field
    Given I have not inputted anything into the number field
    And I leave the input field or attempt to preview or save the exam
    Then an input validation error should appear for the question field
    Given a valid number has been inputted into the field
    Then there should not be a validation error for the question field

  Scenario: no exercises are selected
    Given that I try to preview or save the exam
    And I have not selected any exercises
    Then I should see *0 total selected* as the indicator
    Then I should see a system message saying “No exercises are selected”

  Scenario: resource navigation
    Given that I click on a channel or topic card
    Then I am redirected to a new page
    And there should be resources available to select
    And the breadcrumb path should change accordingly

  Scenario: Topic Card selection
    Given that I click on an unselected topic card
    Then I should select all exercise descendants
    And I should see a snackbar confirming the topic card was selected
    And the *total selected* indicator should increase
    Given I go inside the selected topic
    Then I should see the ‘select all’ checkbox to be selected
    And I should see that all content has been selected
    Given I deselect an exercise(s) or topic
    And I navigate back to the previously selected topic node
    Then the checkbox should change to deselected (or indeterminate) state
    And the *total selected* indicator should decrease accordingly

  Scenario: Topic card deselection
    Given that I click on a selected topic card
    Then I should deselect all exercise descendants
    And I should see a snackbar confirming the topic card was deselected
    And the *total selected* number should decrease

  Scenario: Exercise card selection
    Given that I click on an unselected exercise card
    Then I should select the exercise
    And I should see a snackbar confirming the exercise card was selected
    And the *total selected* number should increase

  Scenario: Exercise card deselection
    Given that I click on a selected exercise card
    Then I should deselect the exercise
    And I should see a snackbar confirming the exercise card was deselected
    And the *total selected* number should decrease

  Scenario: Select all checkbox is selected
    Given that the select all checkbox is unselected
    And I click on it
    Then I should see a snackbar confirming the topic was selected
    And the *total selected* number should increase

  Scenario: Select all checkbox is deselected
    Given that the select all checkbox is selected
    And I click on it
    Then I should see a snackbar confirming the topic was deselected
    And the *total selected* number should decrease

  Scenario: Selected exercise card clicked
    Given that I click on an exercise card that was already selected
    Then I should be redirected to a preview of the exercise
    And there should be an Added indicator
    And there should be an Remove button

  Scenario: Unselected exercise card clicked
    Given that I click on an exercise card that was not selected
    Then I should be redirected to a preview of the exercise
    And there should be an Add button
    And the question renderer should properly show the exercise
    And the question renderer should properly show the correct answers

  Scenario: Channels breadcrumb traversal
    Given that I am not in the channels page
    And i am within a topic page
    And i click on the channels breadcrumb
    Then i should be redirected back to the channels page

  Scenario: Topic breadcrumb traversal
    Given I am within a topic page
    And I click on a topic breadcrumb
    Then I should be redirected back to that topic page
  Scenario: Coach searches by keyword and receives results
    When I enter a keyword into the search box
    And I click the search icon button or keypress enter
    Then I am directed to the search results page for my keyword
    Given there are search results for my keyword
    Then I see topic and/or exercise cards on the search results page

  Scenario: Coach searches by keyword and does not receive results
    When I enter a keyword into the search box
    When I click the search icon button or keypress enter
    Then I am directed to the search results page for my keyword
    Given there are no search results for my keyword
    Then I see verbiage indicating there were no results found

  Scenario: Coach adds an exercise to the exam via the search results page
    Given I am on the search results page
    Given there are exercises available in the search results
    When I click on an exercise checkbox
    Then I see a check appear in the checkbox
    Then I see the *Total selected* count increase by 1
    And I see a snackbar confirmation that the exercise was added to the Exam

  Scenario: Coach adds a topic to the exam via the search results page
    Given I am on the search results page
    Given there are topics in the search results
    When I click on a topic checkbox
    Then I see the *Total selected* count increase by the number of exercises in the selected topic
    And I see a snackbar confirmation that the topic was added to the Exam

  Scenario: Coach removes an exercise via the search results page
    Given I am on the search results page
    Given there are exercises in the search results
    Given one of those exercises is selected
    When I deselect the exercises
    Then I see the *Total selected* count decrease by 1
    And I see a snackbar confirmation that the exercise was deselected from The exam

  Scenario: Coach removes a topic via the search results page
    Given I am on the search results page
    Given there are topics in the search results
    Given one of those topics is selected
    When I deselect the topic
    Then I see the *Total selected* count decrease by the number of Exercises in the topic
    And I see a snackbar confirmation that the topic was deselected from the exam

  Scenario: Coach uses the type filter
    Given I am on the search results page
    When I select the type filter dropdown
    Then I can see the available formats I can filter by (all/exercises/topics)
    Given I select *all* filter option
    Then the search results should display all resource results
    Given I select *exercises*
    Then the search results should only show exercises
    Given I select *topics*
    Then the search results should only show topics

  Scenario: Coach uses the channel filter
    Given I am on the search results page
    When I select the channel filter dropdown
    Then by default I can see channels that contain exercises or topics pertaining to the search results
    And by default, channels that do not contain relevant exercises or topics are hidden
    Given I select a channel
    Then the search results should be filtered by only the selected channel

  Scenario: Coach filters by coach content only
    Given I am on the search results page
    When I select *coach-only* filter option
    Then the search results should include only show coach content

  Scenario: Coach filters by non-coach content only
    Given I am on the search results page
    When I select *non-coach* filter option
    Then the search results should exclude coach content

  Scenario: Coach filters by all content
    Given I am on the search results page
    When I select the *all* filter dropdown
    Then the search results should include both coach and non-coach content

  Scenario: Coach views metadata on exercise cards in search results
    Given I am on the search results page
    Given there are exercises in the search results
    When I see an exercise card
    Then I can see its title
    And I can see its description
    And I can see whether it is a coach exercise or not

  Scenario: Coach views metadata on topic cards in search results
    Given I am on the search results page
    Given there are topics in the search results
    When I see the topic cards
    Then I can see its title
    And I can see its description
    And I can see how many coach exercises/topics it contains inside
    And I can see how many exercises inside were added to the exam

  Scenario: Coach previews a resource in the search results
    Given I am on the search results page
    Given there are exercises in the search results page
    When I click on *Preview* on an exercise card
    Then I see the *Preview resource* page
    When I click on *back arrow* button
    Then I see the search results page again
    And I see my results are still present

  Scenario: Coach exits the search results page
    Given I am on the search results page
    When I click *Exit search*
    Then I see the topic and channel I was viewing before I entered the search results page

  Scenario: Exam preview
    Given that there are no validation errors
    When I click on “preview”
    Then a modal should appear with a question list pulled randomly from each exercise
    And if I click on the randomize questions button
    Then the modal should refresh with a newly randomized question list

  Scenario: save exam
    Given that there are no validation errors
    When I click on “save”
    Then I should be redirected to the exam list page
    And I should see a snackbar confirming the exam was created

  Scenario: Click on the exit icon in the app bar
    Given that i click on the exit icon in the app bar
    Then i should be redirected to the exams list page
    And I should lose all exam creation progress

    Examples:
      | exam_title    | number_of_question | exercises_questions | channel                | topic               |
      | First Quarter | 5                  | Mathématiques       | Khan Academy (English) | Recognize fractions |
