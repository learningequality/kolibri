Feature: Lessons subtab
  Coach needs to be able to see the lesson report details with the progress and score for each learner 

  Background:
    Given I am logged in as a coach
      And I am on *Coach > Reports > Lessons* subtab

# WIP


    Scenario: User clicks on a lesson’s REPORT tab
        Given that I have clicked into a particular lesson
        When I click the REPORT tab
        Then I should see a table with each lesson resource
        And I should also see progress And avg time spent per
        resource
        
    Scenario: User clicks into a lesson item
        When I click into a particular lesson resource
        Then I should be able to see a table list of learners
        And data for their engagement with the resource
        And I should also be able to see summary icons for learners
        Who have completed, started, not started,And are struggling

    Scenario: User clicks into a learner’s attempt report
        Given that I am on the lesson resource report page
        When I click into a particular learner’s name
        Then I should be able to see their attempts at the exercise
        or resource

    Scenario: User clicks on a lesson’s LEARNERS tab
        Given that I am on a lesson’s details page
        When I click the LEARNERS subtab
        Then I should be navigated to a list of learners who are
        assigned that lesson
        And I should also be able to see a column for progress on
        the overall lesson resources

    Scenario: User clicks on a learner’s name in the LEARNERS tab
        Given that I am on a lesson’s details page
        When I click into a particular learner’s name
        Then I should be navigated to a page with that learner’s 
        engagement/progress with all the lesson’s resources

    Scenario: User edits the lesson details from the OPTIONS button
        Given that I am on a lesson’s details page
        When I click the OPTIONS dropdown button
        Then When I click the EDIT DETAILS option
        Then I should see a form appear that will allow me to edit 
        the lesson title, status, recipients, And resource order

    Scenario: User confirms lesson edits from the OPTIONS button
        Given that I have made some changes to the lesson details
        When I click the SAVE button
        Then the form should disappear And I should be navigated
        Back to the lesson details page
        And I should see a snackbar appear saying CHANGES SAVED

    Scenario: User manages lesson resources from the OPTIONS button
        Given That I am on a lesson’s details page
        When I click the OPTIONS dropdown button
        Then When I click the MANAGE RESOURCES option
        Then I should see lesson resource selection interface modal
        appear



  Scenario: View the lesson report details
    When I click the lesson <lesson>
    Then I am on the <lesson> page
      And I see the list of lesson resources
      And I see the progress and average time spent columns for the resources
    When I click the <resource> resource
    Then I am on the *<resource>* report page
      And I see *Preview* button
      And I see *View by groups* unchecked checkbox
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

  Scenario: The resource report page viewed by groups when no groups available
    Given that I am on the <resource> report page
      And the <classroom> has no learner groups
      And the <lesson> has been assigned to the entire <classroom>
      And there is at least one <classroom> learner
    When I click *View by groups* checkbox
    Then I can see *Ungrouped learners* section containing all <lesson> learners

  Scenario: The resource report page viewed by groups when the <lesson> assigned to the entire <classroom>
    Given that I am on the <resource> report page
      And the <classroom> has at least one learner group
      And there is at least one <classroom> learner in this group and at least one <classroom> learner with no group assigned
      And the <lesson> has been assigned to the entire <classroom>
    When I click *View by groups* checkbox
    Then I see <classroom> learners grouped by <lesson> groups
      And I see <classroom> learners with no groups assigned in *Ungrouped learners* section

  Scenario: Empty groups on the resource report page viewed by groups when the <lesson> assigned to the entire <classroom>
    Given that I am on the <resource> report page
      And the <classroom> has at least one empty learners group
      And the <lesson> has been assigned to the entire <classroom>
    When I click *View by groups* checkbox
    Then I see the empty group 

  Scenario: The resource report page viewed by groups when the <lesson> assigned to a group
    Given that I am on the <resource> report page
      And the <classroom> has at least one learner group
      And there is at least one <classroom> learner in this group and at least one <classroom> learner with no groups assigned
      And the <lesson> has been assigned to this group
    When I click *View by groups* checkbox
    Then I see <classroom> learners grouped by <lesson> groups
      And I cannot see <classroom> learners with no groups assigned

  Scenario: Empty groups on the resource report page viewed by groups when the <lesson> assigned to a group
    Given that I am on the <resource> report page
      And the <classroom> has at least two empty learners groups
      And the <lesson> has been assigned to one of them
    When I click *View by groups* checkbox
    Then I see the empty group which has been assigned to the <lesson>
      And I cannot see the empty group which has not been assigned to the <lesson>

  Scenario: View resource preview
    Given that I am on the <resource> report page
    When I click *Preview* button
    Then I can see the <resource> preview
    When I click the back arrow in the immersive toolbar
    Then I am returned to the <resource> report page

  Scenario: View resource preview when <classroom> learners grouped by <lesson> groups
    Given that I am on the <resource> report page
      And learners are grouped by <lesson> groups
    When I click *Preview* button
    Then I can see the <resource> preview
    When I click the back arrow in the immersive toolbar
    Then I am returned to the <resource> report page
      And *View by groups* checkbox stays checked
      And I can see learners grouped by <lesson> groups

Examples:
| classroom | lesson  | groups | resource           |
| My class  | My quiz | group1 | One digit division |

