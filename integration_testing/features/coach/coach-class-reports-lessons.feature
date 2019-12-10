Feature: Lessons subtab
  Coach needs to be able to see the learner's progress in the lesson report details

  Background:
    Given I am logged in as a coach
      And I am on *Coach - '<class>' > Reports > Lessons* subtab
      And there is a <lesson> with a <resource> and <exercise> assigned to <class>

    Scenario: Review lesson reports
      When I click on lesson <lesson>
      Then I see the *Report* tab and the table with each lesson resource
        And I see the *Progress* and *Average time spent* columns for each resource

    Scenario: Review resource progress *Report* subtab
      When I click on a resource <resource>
      Then I see the table of learners
        And I see the summary icons (learners who completed, started, not started, and struggling)
        And I see engagement data (status, time spent, group, last activity) for each learner assigned the resource

    Scenario: Review progress from *Learners* subtab
        Given that I am on a lesson <lesson> details page
          When I click on the *Learners* subtab
          Then I see the table with learners who are assigned that lesson
            And I see the columns for progress on the overall lesson resources

    Scenario: Review exercise attempt report
      Given that I am on *Coach - '<class>' > Reports > Lessons > '<lesson>' > Learners* subtab
        When I click on the <learner> name
        Then I see the table with resources in the lesson <lesson>
          And I see columns with <learner> progress and time spent on each exercise or resource in the <lesson>
        When I click on <exercise> exercise
        Then I see the attempt report of the <learner> for each question in the <exercise>

  Scenario: Learner has not started a resource
    When a learner has not started <resource> or <exercise>
    Then the learner's *Progress* column states *Not started*

  Scenario: Learner has submitted an answer to a resource
    When a learner has answered a question on a <resource> or <exercise>
    Then the *Time Spent* column automatically updates the time value
      And the *Last Activity* column automatically updates the time value

  Scenario: Learner has started a resource
    When a learner has started an <resource> or <exercise>
    Then the learner's *Progress* column states *Started*

  Scenario: Learner has completed a resource
    When a learner has completed <resource> or <exercise>
    Then their *Progress* column states *Completed*

  Scenario: Learner needs help with a resource
    When a learner has given 2 wrong answers in the <exercise>
    Then their *Progress* column states *Needs help*

	Scenario: Review exercise attempt report
    Given that I am on the *'<resource>' > Report* subtab
    	And <resource> is an exercise
	      When I click the <learner> learner name
	      Then I see their attempts for each question in the exercise

  Scenario: Open the Learners tab
    Given that I am on the *'<lesson>' > Report* subtab
      When I click to open the *Learners* subtab
      Then I see a table with learners to whom the <lesson> is assigned
      	And I see the *Progress* and *Groups* columns

  Scenario: View report for all resources for a learner
    Given that I am on the *'<lesson>' > Learners* subtab
      When I click the <learner> learner name
      Then I am on *'<lesson>' > '<learner>'* page
      	And I see a table with all the resources <learner> has engaged with
      	And I see the *Progress* and *Time spent* columns for each <resource>

  Scenario: View the resource report page by groups
    Given that I am on the *'<resource>' > Report* subtab
    	And the <resource> is assigned to entire class
    	And some groups are empty
    	And some learners are ungrouped
		    When I click the *View by groups* checkbox
		    Then I see separate tables for each group
		    	And I see empty groups that are recipients of the <lesson>
		    		But I don't see empty groups that aren't recipients of the <lesson>
		    	And I see *Ungrouped learners* section with those learners

  Scenario: View resource preview
  	Given that *View by groups* checkbox is checked
	    When I click *Preview* button
	    Then I can see the <resource> preview
	    When I click the back arrow button in top left corner
	    Then I am on the <resource> resource page again
	    	And I see separate tables for each group
	    	And the *View by groups* checkbox is still checked

Examples:
| class     | learner  | lesson         | exercise   | resource                 |
| My class  | Marc G.  | Basic division | Divide up! | One digit division video |
