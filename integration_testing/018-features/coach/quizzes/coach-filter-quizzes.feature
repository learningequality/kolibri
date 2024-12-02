Feature: Coach can filter quizzes by status and recipients
  Coaches need to be able to filter quizzes by status and recipients.

	Background:
    Given I am signed in to Kolibri as a super admin or a coach
      And I am at the *Coach - '<class>' > Quizzes* page
      And there are imported channels with exercises on the device
      And there are created quizzes with all three statuses (*Started*, *Not started*, *Ended*)

	Scenario: Coach filters by status
    When I look at the *Status* filter
    Then I can see that it is set to *All* by default
    When I select any of the other three statuses (*Started*, *Not started*, *Ended*)
    Then I see only quizzes with the selected status
    When there are no quizzes with the selected status
    Then I see the *No results* text in the table

  Scenario: Coach filters by recipients
    When I look at the *Recipients* filter
    Then I can see that it is set to *All* by default
    When I select any of the available options
    Then I see only quizzes assigned to the selected recipient
    When there are no quizzes with the selected recipient
    Then I see the *No results* text in the table
