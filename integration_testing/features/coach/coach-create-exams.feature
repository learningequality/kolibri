Feature: Coach create exams
  Coach needs to be able to create exams from existing content

  Background:
    Given I am signed in to Kolibri as a coach user
    And I am on the *Coach > Exams* page

  Scenario: Create new exam
    When I click the *New exam* button
    Then I see a new *Create new exam* page
      And I see empty *Title* and *Number of questions* fields
      And I see *0 total selected* exercises
      And I see a list of channels that contain exercises
      But I don't see any checkboxes
    
  # Given there are no channels that have exercises
  # Then there should not be any channels available to select
  Scenario: Try and fail to create new exam when no channel on device contains exercises
    When I click the *New exam* button
    Then I see a new *Create new exam* page
      And I see empty *Title* and *Number of questions* fields
      And I see *0 total selected* exercises indicator
      But I don't see any channels

  Scenario: Check validation for the title field 
    Given I have not inputted an exam title (yet)
    When I leave the input field or attempt to preview or save the exam
    Then an input validation error appears
    When I input a valid title into the field
    Then I don't see the validation error anymore

  Scenario: Check validation for the number of questions field
    When I input a number outside the range of 1-50
      And I leave the input field or attempt to preview or save the exam
    Then an input validation error appears
    When I input a number greater than amount of exercise questions
      And I leave the input field or attempt to preview or save the exam
    Then an input validation error appears
    When I don't input anything into the number field
      And I leave the input field or attempt to preview or save the exam
    Then an input validation error appears
    When I input a valid number
    Then I don't see the validation error anymore

  Scenario: Check validation when no exercises are selected
    When I don't select any exercises
      And I see *0 total selected* indicator
    Then I see “No exercises are selected” error message

  Scenario: Navigate resources
    When I click on a channel or topic card
    Then I am redirected to a new page
      And I see channel/topic resources
      And I see the breadcrumb path for the channel/topic
    When I click on a parent topic breadcrumb
    Then I am redirected back to that topic
    When I click on the *Channels* breadcrumb
    Then I am redirected back to the list of *Channels* under *Select topics or exercises*

  Scenario: Select resources from a topic
    When I check an unselected topic card checkbox
    Then I see that all the exercise descendants are selected (*n of n resources selected*)
      And I see a snackbar confirmation
      And the see the value of *n total selected* indicator is increased
    When I click the topic card of the selected topic
    Then I see the *Select all* checkbox is selected
      And I see that all its content is selected
    When I uncheck an exercise or a topic
      And I navigate back to the parent topic node
    Then I see the checkbox changed to partial (*-*) state
      And I see the value of *n total selected* indicator is decreased

  Scenario: Select and remove resources from a topic
    When I uncheck fully selected topic card checkbox
    Then I see that none of the exercise descendants are selected (*0 resources selected*)
      And I see a snackbar confirmation
      And the see the value of *n total selected* indicator is decreased

  Scenario: Select a single exercise
    When I check an unselected exercise card checkbox
    Then I see a snackbar confirmation
      And the see the value of *n total selected* indicator is increased

  Scenario: Select and remove a single exercise
    When I uncheck a selected exercise card checkbox
    Then I see a snackbar confirmation
      And the see the value of *n total selected* indicator is decreased

  Scenario: Use the *Select all* checkbox
    Given that the *Select all* checkbox is unchecked
    When I check the *Select all* checkbox 
    Then I see a snackbar confirming the topic was added
      And I see the value of *n total selected* indicator is increased
    When I uncheck the *Select all* checkbox 
    Then I see a snackbar confirming the topic was removed
      And I see the value of *n total selected* indicator is decreased

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
      And I see the *No results found...* message

  Scenario: Add a topic or exercise from search results page
    Given I am on the search results page
      And there are exercises and topics available in the search results
    When I check an exercise checkbox
    Then I see the *n total selected* count increase by 1
      And I see a snackbar confirmation that the exercise was added to the exam
    When I check a topic checkbox
    Then I see the *n total selected* count increase for the number of exercises in the selected topic
      And I see a snackbar confirmation that the topic was added to the exam

  Scenario: Remove a topic or exercise from search results page
    Given I am on the search results page
      And there are exercises and topics available in the search results
      And some of them are selected 
    When I uncheck an exercise checkbox
    Then I see the *n total selected* count decrease by 1
      And I see a snackbar confirmation that the exercise was removed from the exam
    When I uncheck a topic checkbox
    Then I see the *n total selected* count decrease for the number of exercises in the removed topic
      And I see a snackbar confirmation that the topic was removed from the exam

  Scenario: Filter search results by type
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
