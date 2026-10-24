Feature: Coaches automatic syncing
	Coach can track the progress of the Learners on learn-only devices and see their statuses.

  Background:
    Given I am signed in as a coach user
    	And there is at least one channel imported on the device
    	And there is a class to which I am assigned as a coach
    	And I have created a lesson and a quiz
    	And there are learn-only devices which are connected to the classroom server
    	And learners enrolled in my class have completed a lesson and a quiz

	Scenario: Coach can see the *View learner devices* link and the sync statuses of every connected device
    Given I am at *Class home > <class>* page for the class
    When I look at the section with the class name
    Then I see the name of the class, the assigned coaches and the number of learners
    	And I see the *View learners* link
    	And I see the *Quizzes*, *Lessons* and *Class activity* panels
    When I click on the *View learner devices* link
    Then I can see the *Learners in <class>* table
    	And I can see which learner devices are connected to the central Kolibri server
    	And I can see when did they last synced the progress activity
			And I see the sync statuses of every connected device
		When I click the *Information about sync statuses* hyperlink
		Then I see the *Information about sync statuses* modal
			And I can see information for each individual sync status such as *Synced*, *Syncing*, *Waiting to sync*, *Not recently synced or unable to sync*, *Not enough storage*, *Not connected to server*

	Scenario: Coach can see the sync statuses of the learners from the *Lessons* and *Quizzes* pages
		When I go to *Coach > <class> Lesson* or *Coach > <class> Quizzes*
			And I click the *View learner devices* link
		Then I see the *Learners in '<class>'* table with all devices connected to the classroom server
			And I see the sync statuses of every connected device

	Scenario: Coach can see the progress made by learners after a successful sync to the server
  	Given a learner has just completed a resource and a quiz
  	 And the learn-only device has automatically synced to the server
  	When I go to the *Class home > <class>* page for the class
  	Then I can see the correct lesson and quiz completion progress
  		And I see the correct class activity

	Scenario: Coach can see learners with *Not enough storage* error status
		Given there are learner devices with not enough storage
		When I go to *Coach > Class home*
			And I click *View learners*
		Then I am at *Coach > Class home > <class>* page
			And I see a list with all the learners enrolled in the class
			And I see a *Device status* value next to the *username* of each learner
			And I see a *!* red icon and a *Not enough storage* text next to any learners with not enough storage
		When I click the link *Information about sync statuses*
		Then I see the *Information about sync statuses* modal
			And I see information about all of the available sync statuses
			And I see a *!* red icon and a *Not enough storage* text next to it
			And I see the following text: This device does not have enough space for updates. Try checking the size of your active lessons and quizzes and archiving the ones you aren't using right now.*
