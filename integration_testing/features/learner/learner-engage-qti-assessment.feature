Feature: Learner answers a QTI assessment item
  Learner can answer each supported QTI v3 interaction type, inside exercises, practice quizzes and coach quizzes

  Background:
    Given I am signed in as a learner user
      And I am engaging with a <resource> that contains QTI v3 items
      And I am on a QTI item in answer mode

  Scenario: Answer a single-select choice interaction
    Given the item has a choice interaction that allows a single answer
    Then I see a prompt to choose one answer
      And each choice is a full-width row with an empty circular indicator
    When I select a choice
    Then its row highlights and its circular indicator fills
    When I select a different choice
    Then my earlier choice is cleared and only the new one stays selected
    When I navigate the choices by keyboard
    Then Enter or Space selects the focused choice

  Scenario: Answer a multiple-select choice interaction
    Given the item has a choice interaction that allows up to a maximum number of answers
    Then I see a prompt for how many answers to select
      And each choice is a full-width row with an empty square checkbox indicator
    When I select choices
    Then each selected row highlights and its checkbox shows a checkmark
      And I can select and clear choices independently of one another
    When I have selected the maximum number of choices
    Then I cannot select a further choice until I clear one
    When I submit having selected fewer than the required minimum
    Then I am told how many choices I must select
    When the choices are set to shuffle
    Then their order is randomised while any fixed choices keep their position

  Scenario: Answer an order interaction
    Given the item has an order interaction presenting choices in an initial, possibly shuffled, order
    Then I see a prompt to drag, or use the arrow buttons, to reorder
    When I drag a choice by its handle to a new position
    Then the list order updates immediately
    When I focus a choice by keyboard
    Then its drag handle is replaced by move-up and move-down buttons that move it directly
      And focus stays on the moved choice and its new position is announced
    Then my arrangement is recorded as an ordered list of choices

  Scenario: Answer an associate interaction
    Given the item has an associate interaction with one set of choices
      And each association is a pair of two connected slots, each holding one choice
    When I drag a choice into each of a pair's two slots
    Then the two filled slots form an unordered pair, both choices drawn from the same set
    When I use the keyboard instead
    Then I cycle each slot through the choices to fill it
      And a choice cannot be used beyond its allowed number of associations

  Scenario: Answer a match interaction with single-choice targets
    Given the item has a match interaction with two distinct sets of choices
      And each target holds one choice
    When I drag a choice onto a target
    Then the target holds that choice, associating it across the two sets
    When I use the keyboard instead
    Then I cycle the target through the choices to fill it
    When I assign a different choice to the same target
    Then it replaces the previous one
      And I can only associate choices across the sets, never within one set

  Scenario: Answer a match interaction with multi-choice targets
    Given the item has a match interaction with two distinct sets of choices
      And a target can hold more than one choice
    When I drag several choices onto a target
    Then the target holds every choice I assigned
    When I use the keyboard instead
    Then I add and remove choices on the target
      And a choice is used across targets only up to its allowed limit

  Scenario: Answer a gap match interaction
    Given the item has a gap match interaction with gaps embedded in the passage and a pool of text or image choices
      And each gap is filled from the pool and holds a single choice
    When I drag a choice from the pool into a gap
    Then the gap shows that choice
      And the same choice fills another gap only up to its allowed limit
    When I use the keyboard instead
    Then I cycle the gap through the choices to fill it
    When I clear a filled gap
    Then the choice returns to the pool

  Scenario: Answer an inline choice interaction
    Given the item has an inline choice interaction within a sentence
    When I open the inline dropdown and pick one option
    Then the sentence reads with my selected option in place

  Scenario: Answer a text entry interaction
    Given the item has a text entry field within a sentence
    When I type my answer into the field
    Then my text is captured as the response

  Scenario: Answer a numeric text entry interaction
    Given the item has a text entry field that expects a number
    When I enter my answer into the field
    Then only numeric input is accepted
      And I can enter my answer in any number system I choose
      And an on-screen number keypad is shown to help me enter it

Examples:
  | resource           |
  | a QTI exercise     |
