Feature: Coach learners report
    Coach should be able to access Kolibri Coach tab
    facility admin should be assign classes to coach facility to access the coach tab
    Coach can look at each of the report types for the progress you have just logged

  Background:
    Given there is a learner account with name "Hansen" in class "Buffoons"
    And there is a channel with name "Pratham Books' StoryWeaver" with topic "Night Trouble" that  contains exercises
    And learner account named "Hansen" has completed all the exercises under topic "Night Trouble" containing topic "Pratham Books' StoryWeaver"
    Given I am logged in as a coach for the facility

  Scenario: Reviewing exercise completion of a particular student in a class for a topic
    When I click on the Coach tab in the sidebar
    Then I see a list of classes (as well as an "All Learners" link)
    When I click on the "Buffoons" class link
    When I click on the "Learners" sub-tab
    When I click on "Hansen"
    When I click on "Pratham Books' StoryWeaver" channel
    Then I see a row called "Night Trouble" with a progress bar showing 100% under the "Avg. exercise progress" column

  Scenario: Reviewing exercise completion of a particular unenrolled student for a topic
    When I click on the Coach tab in the sidebar
    Then I see a list of classes (as well as an "All Learners" link)
    When I click on the "All Learners" link
    When I click on the "Learners" sub-tab
    When I click on "Hansen"
    When I click on "Pratham Books' StoryWeaver" channel
    Then I see a row called "Night Trouble" with a progress bar showing 100% under the "Avg. exercise progress" column

