Feature: Coaches automatic syncing

  Background:
    Given I am signed in as a coach user

	Scenario: See which learners have the *Not enough storage* error status
		Given there are learner devices with not enough storage
		When I go to *Coach > Class home*
			And I click *View learners*
		Then I am at *Coach > Class home > <class>* page
			And I see a list with all the learners enrolled in the class
			And I see a *Device status* value next to the *username* of each learner
			And I see a *!* red icon and a *Not enough storage* text next to any learners with not enough storage

	Scenario: See explanation of *Not enough storage* error status
		Given I am at *Coach > Class home > <class>* page
		When I click the link *Information about sync statuses*
		Then I see the *Information about sync statuses* modal
			And I see information about all of the available sync statuses
			And I see a *!* red icon and a *Not enough storage* text next to it
			And I see the following text: This device does not have enough space for updates. Try checking the size of your active lessons and quizzes and archiving the ones you aren't using right now.*

	Scenario: Go to manage lessons and quizzes from the storage error alert
		Given I am at *Coach > Class home > <class>* page
			And there are learner devices with not enough storage
		Then I see the storage error alert above the table: *Some devices do not have enough storage for updates. Change the visibility of any active lessons and quizzes you aren't using right now to free up space.*
			And I see a *Manage lessons and quizzes* link
		When I click the *Manage lessons and quizzes* link
		Then I am at the *Coach > Plan* tab

	Scenario: Check file size of lessons in Reports tab
		Given I am at the *Coach > Reports* tab
		When I look at the *Coach > Reports > Lessons* table
		Then I see the following text above the table: *Total size of lessons that are visible to learners: N MB*
			And I see the *Size* column between the *Recipients* and *Visible to learners* columns
			And I see the size of each lesson
		When I click on the title of a lesson
		Then I am at the lesson details page
			And I see the size of the lesson below the lesson description

	Scenario: Check file size of quizzes in Reports tab
		Given I am at the *Coach > Reports* tab
		When I go to the *Coach > Reports > Quizzes* tab
		Then I see the following text above the *Quizzes* table: *Total size of quizzes that are visible to learners: N MB*
			And I see the *Size* column between the *Recipients* and *Status* columns
			And I see the size of each lesson
		When I click on the title of a quiz
		Then I am at the quiz details page
			And I see the size of the quiz below the question order

	Scenario: Check file size of lessons in Plan tab
		Given I am at the *Coach > Plan>* tab
		When I look at the *Coach > Plan > Lessons* table
		Then I see the following text above the table: *Total size of lessons that are visible to learners: N MB*
			And I see the *Size* column between the *Title* and *Recipients* columns
			And I see the number of resources for each lesson
			And I see the size of each lesson
		When I click on the title of a lesson
		Then I am at the lesson details page
			And I see the size of the lesson below the lesson description

	Scenario: Check file size of quizzes in Plan tab
		Given I am at the *Coach > Plan>* tab
		When I go to *Coach > Plan > Quizzes* tab
		Then I see the following text above the quizzes table: *Total size of quizzes that are visible to learners: N MB*
			And I see the *Size* column between the *Recipients* and *Status* columns
			And I see the size of each quiz
		When I click on the title of a quiz
		Then I am at the quiz details page
			And I see the size of the quiz below the question order
