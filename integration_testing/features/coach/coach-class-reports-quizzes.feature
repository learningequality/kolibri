Feature: Coach reviews learner reports for quizzes
  Coach can see the progress and score for each learner for a given quiz

  Background:
    Given I am logged in as a coach
      And I am on *Coach > Classroom <classroom> > Reports > Quizzes > <quiz>* page

        
Feature: Quizzes subtab
        Scenario: User clicks on a quiz’s REPORT tab
            Given that I have clicked into a particular quiz
            When I click into the REPORTS tab
            Then I should see a high level summary of the quiz status
            And I should see a list of learners assigned the quiz

        Scenario: User clicks into learner’s quiz report
            Given that I am on the quiz report page
            When I click into a particular learner
            Then I should see the learner’s attempts on the quiz

        Scenario: User clicks on a quiz’s DIFFICULT QUESTIONS tab
            Given that I am on the quiz report page
            When I click the DIFFICULT QUESTIONS tab
            Then I should be able to see a list of the most difficult
            quiz questions 
            
        Scenario: User clicks into a difficult question
            Given that I am on the DIFFICULT QUESTIONS tab
            When I click into a particular difficult question
            Then I should be navigated to a new page showing each
            learner who has had trouble on that question

        Scenario: User clicks between different learner names in the
        difficult question page
            Given that I am on the DIFFICULT QUESTIONS tab
            When I click between different learner names on the sidebar
            Then I should be able to see each learner’s attempt on the
            question

        Scenario: User previews the quiz from the OPTIONS button
            Given that I am on the quiz details page
            When I click on the PREVIEW option from the OPTIONS button
            Then I should be navigated to a quiz preview page

        Scenario: User edits the quiz details from the OPTIONS button
            Given that I am on the quiz details page
            Given that I  clicked on the OPTIONS dropdown button
            When I click on the EDIT DETAILS option
            Then I should see a form appear that will allow me to edit 
            the quiz title, recipients, And status
            


  Scenario: Report has the average score
    Given that <quiz> has at least one learner who started or completed it
      When I look under the *Overall* heading
      Then I see the *Average score* message with the the average of those learners' scores

  Scenario: Only assigned learners appear in the reports
    When <quiz> is assigned to <groups>
    Then only learners in <groups> appear in the reports

  Scenario: Viewing reports not organized by learner groups
    When the *View by groups* checkbox is unchecked
    Then all the learners appear in a single report table
      And all the learners are sorted alphabetically by their full name

  Scenario: Viewing reports organized by learner groups
    When the *View by groups* checkbox is checked
    Then the learners in each group appear in separate tables
      And the groups are sorted alphabetically
      And all learners are sorted alphabetically by their full name

  Scenario: A learner has not started a quiz
    When a learner has not started <quiz>
      And they have all the questions remaining
    Then the learner's *Progress* column says *Not started*
    # Currently implemented report states *0 of N completed*?
      And their *Score* column is blank

  Scenario: A learner has started a quiz
    When a learner has started an <quiz>
      And they have some of the questions remaining
    Then the learner's *Progress* column shows the number of questions remaining
      #Or *0 of N completed*?
      And their *Score* column shows the current score

  Scenario: A learner has completed a quiz
    When a learner has completed <quiz>
    Then their *Progress* column says *Completed*
    # Currently implemented report states *All N completed*?
      And their *Score* column shows the current score

Examples:
| classroom | quiz    | groups         |
| My class  | My quiz | group1, group2 |
