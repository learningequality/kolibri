Feature: Learner engages with an assigned lesson
  Learner can access the lesson that has been assigned by coach, pause and resume it, and collect points

  Background:
    Given I am signed in as a learner user
      And I am on *Learn > Classes > '<class>'* page
      And there is a <lesson> lesson assigned to me, with (in order) <exercise1>, <video> and <exercise2> content items

  Scenario: Open an assigned lesson
    When I click to select the <lesson> lesson that displays no progress bar/icon 
    Then I am at *Learn > Classes > '<class>' > '<lesson>'* page
      And I see <exercise1> exercise and <video> video
    When I click on <exercise1> exercise content card
    Then I am on *'<lesson>' > '<exercise1>'* page
      And I see the <exercise> questions
      And I see the blue *Started* icon added to the title
      And I see the *Next in lesson* heading and <video> video content card under the exercise
    When I answer 2 questions correctly
      And I see two green checkmarks at the bottom of the lesson viewer
    Then I stop

  Scenario: Skip to the next content item in the lesson
    Given that I didn't finish answering all the questions in the exercise
      When I click the <video> video content card under the *Next in lesson* heading 
      Then I am on *'<lesson>' > '<video>'* page
        And I see the video starts playing automatically
        And I see the blue *Started* icon added to the title
      When video finishes
      Then I see the yellow *Completed* icon added to the title
        And I see the *+500 points* snackbar alert
        And I see the snackbar alert with the title of the following <exercise>
      When I click the *X* button to close the <lesson> content viewer
      Then I am on the *Learn > Classes > '<class>' > '<lesson>'* page again
        And I see my points counter is increased by 500
        And I see the <exercise1> exercise is marked with *Started* icon
        And I see the <video> video is marked with *Completed* icon
          But I don't see any icons for <exercise2> exercise

  Scenario: Resume engaging with unfinished exercise
    Given I am on the *Learn > Classes > '<class>' > '<lesson>'* page
      When I click on <exercise1> exercise content card marked with *Started* icon
      Then I am on *'<lesson>' > '<exercise1>'* page
        And I see two green checkmarks at the bottom of the lesson viewer
      When I finish answering all the required questions
      Then I see the yellow *Completed* icon added to the title
        And I see the *+500 points* snackbar alert
        And I see the snackbar alert with the title of the following <video>
      When I click the *X* button to close the <lesson> content viewer
      Then I am on the *Learn > Classes > '<class>' > '<lesson>'* page again
        And I see my points counter is increased by another 500
        And I see both the <exercise1> and <video> video are marked with *Completed* icon
          But I don't see any icons for <exercise2> exercise

  Scenario: Complete the lesson
    Given I am on the *Learn > Classes > '<class>' > '<lesson>'* page
      When I click on <exercise2> exercise content card
      Then I am on *'<lesson>' > '<exercise2>'* page
      When I finish answering all the required questions
      Then I see the yellow *Completed* icon added to the title
        And I see the *+500 points* snackbar alert
      When I click the *X* button to close the <lesson> content viewer
      Then I am on the *Learn > Classes > '<class>' > '<lesson>'* page again
        And I see my points counter is increased by another 500
        And I see all 3 content items marked with *Completed* icon
        And I see the <lesson> is also marked with *Completed* icon
      When I click on the <class> in the breadcrumbs link
      Then I am on *Learn > Classes > '<class>'* page
        And I see the <lesson> lesson is marked with *Completed* icon
