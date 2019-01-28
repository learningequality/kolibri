Feature: Coach reviews lesson report
  Coach needs to be able to see the lesson report details with the progress and score for each learner 

  Background:
    Given I am logged in as a coach
      And I am on *Coach > Classroom <classroom> > Reports > Lessons* page

  Scenario: View the lesson report details
    When I click the lesson <lesson>
    Then I am on the <lesson> page
      And I see the list of lesson resources
      And I see the progress and average time spent columns for the resources
    When I click the <resource> resource
    Then I am on the *<resource>* report page
      And I see the progress, time spent and last activity column on <resource> for each of the learners lesson <lesson> is assigned to

  Scenario: Learner has not started a resource
    When a learner has not started <resource>
    Then the learner's *Progress* column states *Not started*

  Scenario: Learner has started a resource
    When a learner has started an <resource>
    Then the learner's *Progress* column states *Started*

  Scenario: Learner has completed a resource
    When a learner has completed <resource>
    Then their *Progress* column states *Completed*

  Scenario: Learner needs help with a resource
    Given the <resource> is an exercise
      When a learner has ******** <resource> 
      # Clarify conditions for *Needs help*
      Then their *Progress* column states *Needs help*

Examples:
| classroom | lesson  | groups | resource           |
| My class  | My quiz | group1 | One digit division |

