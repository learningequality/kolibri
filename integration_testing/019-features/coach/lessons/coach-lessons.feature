Feature: Lessons
  Coach can see the lessons assigned to the class and the learner's progress in the lesson's details page

  Background:
    Given I am signed in as a coach
      And I am at *Coach > Lessons*
      And there is at least one imported channel
      And there are lessons with resources assigned to the class
      And there are learners who have started, completed or need help with resources

  Scenario: Lessons page overview
    When I go to *Coach > Lessons*
    Then I see the *Lessons* page
    	And I see the *New lesson* button
    	And I see the class name, the total size of lessons visible to learners, filters by status and recipients, *View learner devices* link (visible only when there are learn-only devices), *Print report* and *Export as CSV* icons
    	And I see a table with all of the lessons with the following columns: *Title*, *Progress*, *Size*, *Recipients*, *Visible to learners*

  Scenario: Coach can create a new lesson for the entire class and make it visible
    When I click *New lesson* button
    Then I see the *Create new lesson* modal
    When I fill in the title of the lesson
      And I fill in the description # optional
      And I set the *Recipients* # optional, skip for this case
      And I click the *Save changes* button
    Then the modal closes
    	And I see the *Lesson created* snackbar message
      And I see the lesson details page
    	And I see the lesson title, the *Manage resources* button and the *...* button next to it
    	And I see the side panel with *Visible to learners* status (off by default), *Recipients*, *Description*, *Class*, *Size*, *Date created*
    	And I see the *Resources* tab and *Title*, *Progress* and *Average time spent* columns for each resource
    	And I see a *No resources in this lesson* text
    	And I see the *Learners* tab
    When I click on the *Learners* tab
    Then I see a table with the learners
    	And I see the following columns: *Name*, *Progress*, *Groups
    	And I see the progress made by each learner
    When I click on *Manage resources* button
    Then I see the *Manage lesson resources* side panel
			And I see the *Select from bookmarks* label and the *Bookmarks* card below it
			And I see the *Select from channels* card label and the channel cards for the available channels below it
			And I see a *Search* button next to the *Select from bookmarks* label
			And I see a *Save & finish* button at the lower right corner of the panel
		When I click on a channel card
		Then I see all of the available channel folders
		When I click on a folder with resources
		Then I can see the list with available resources
		When I select one or several resources
		Then I see the *N resource(s)selected (N MB)* link to the left of the *Save & finish* button
		When I click the *Save & finish* button
		Then I am back at the *Coach > <class> > Lesson > <lesson>* page
			And I see a *N resource(s) added* snackbar message
			And I can see that the selected resources are added to the table with lesson resources
		When I click the *Visible for learners* switch for a lesson
    Then I see the switch slide in the ON position (blue)
      And I see the *Lesson is visible to learners* snackbar notification
    When I click the *All lessons* link
    Then I am back at *Coach > Lessons*
    	And I can see that the lesson is with status set to *Visible to learners*

  Scenario: Coach can assign existing lesson to different recipients
    Given I am at the lesson details page
    When I click the *...* button
    	And I select the *Edit details* option
    Then I see the *Edit lesson details* modal
    When I change the *Recipients* by selecting *Individual learners* or one of the available groups
      And I click the *Save changes* button
    Then the modal closes
    	And I see the *Lesson created* snackbar message
      And I see the lesson details page
      And the *Recipients* field reflects the changes I've made

  Scenario: Coach can add and remove lesson resources
    Given I am at the lesson details page
    When I click the *Manage resources* button
    Then I can see the *Manage lesson resources* side panel
		When I click on a channel card
		Then I see all of the available channel folders
		When I click on a folder with resources
		Then I can see the list with available resources
		When I select one or several resources
		Then I see the *N resource(s)selected (N MB)* link to the left of the *Save & finish* button
		When I click the *Save & finish* button
		Then I am back at the *Coach > <class> > Lesson > <lesson>* page
			And I see a *N resource(s) added* snackbar message
			And I can see that the selected resources are added to the list with lesson resources
		When I click on the *x* icon next to a resource
		Then I see *1 resources removed Undo* snackbar message

  Scenario: Review lesson details
    When I click on the title of a lesson
    Then I see the lesson details page
    	And I see the lesson title, the *Manage resources* button and the *...* button next to it
    	And I see the side panel with *Visible to learners* status, *Recipients*, *Description*, *Class*, *Size*, *Date created*
    	And I see the *Resources* tab with a table with the available lesson resources and and *Title*, *Progress* and *Average time spent* columns for each resource
    	And I see options to rearrange the order of the resources or to remove a resource
    	And I see the *Learners* tab
    When I click on the *Learners* tab
    Then I see a table with the learners
    	And I see the following columns: *Name*, *Progress*, *Groups
    	And I see the progress made by each learner

  Scenario: Coach turns on/off the lesson *Visible for learners* status
    When I click the *Visible for learners* switch for a lesson
    Then I see the switch slide in the ON position (blue)
      And I see the *Lesson is visible to learners* snackbar notification
    When as a learner I reload the class page
    Then I see the lesson
    When as a coach I turn off the *Visible for learners* switch for the same lesson
    Then I see the *Lesson is not visible to learners* snackbar notification
    When as a learner I reload the class page
    Then I no longer see the lesson #repeat the same scenario while at the lesson details page

  Scenario: Coach turns on/off the lesson *Visible for learners* status - Learn-only devices
    Given there are learners using Learn-only devices in this class
    When I click the *Visible for learners* switch for a lesson
    Then I see the switch slide in the ON position (blue)
      And I see a modal open that says *Make lesson visible* and displays the total size in bytes for the current lesson
    When I click *Continue*
    Then I see the *Lesson is visible to learners* snackbar notification
    When I reload the browser as a learner #after the device has synced with the server
    Then I see the lesson
    When as a coach I turn off the *Visible for learners* switch for the same lesson
    Then I see the *Lesson is not visible to learners* snackbar notification
    When as a learner I reload the class page #after the device has synced with the server
    Then I no longer see the lesson #repeat the same scenario while at the lesson details page

  Scenario: Coach can edit the title and description of an existing lesson
  	Given I am at the lesson details page
    When I click the *...* button
      And I select the *Edit details* option
    Then I see the *Edit lesson details* page
    When I change the title and description of the lesson
      And I click the *Save changes* button
    Then I see the lesson details page again
    	And I see a *Changes saved* snackbar notification
      And I see that the title of the lesson is changed
    When I click on the title of the lesson
    Then I see the lesson details page
    	And I can see that the description of the lesson is also changed

  Scenario: Cannot change the title of an existing lesson if it is already used
    Given I am at the *Edit lesson details* page
      When I try to rename the channel by entering an existing lesson title
      Then I see the following validation message: *A lesson with this name already exists*
        And I cannot save until I choose another title

  Scenario: Copy lesson to the same class and assign it to the entire class
    Given I am at the lesson details page
    When I click *...* button next to *Manage resources*
      And I select the *Copy lesson* option
    Then I see the *Copy lesson to* modal
      And I see that *'<class>' (current class)* is selected
    When I click the *Continue* button
    Then the modal content changes and asks to select recipients
      And I see that *Entire class* is selected by default
    When I click the *Copy* button
    Then the modal closes
			And the snackbar confirmation appears
    When I click on *All Lessons*
    Then I see the *Copy of '<lesson>'* in the list of lessons
      And I see *Entire class* value for it under the *Recipients* heading
      And I see that the *Visible to learners* status is set to off

  Scenario: Copy lesson to a different class and assign it to just one group
    Given I am at the lesson details page
    	And there is a class for which there is a group of learners
    When I click *...* button next to *Manage resources*
      And I select the *Copy lesson* option
    Then I see the *Copy lesson to* modal
      And I see that *'<class>' (current class)* is selected
    When I select a different class
      And I click the *Continue* button
    Then the modal content changes and asks to select recipients
      And I see that *Entire class* is selected by default
    When I select a group
      And I click the *Copy* button
    Then the modal closes
      And the snackbar confirmation appears
    When I open the sidebar
      And I click on *Coach*
      And I select the other class
      And I go to the *Coach > Lessons* page
    Then I see the *Copy of '<lesson>'* in the lessons table
      And I see the specified group under the *Recipients* heading

  Scenario: Coach can delete a lesson
    Given I am at the lesson details page
     When I click the *...* button
      And I select *Delete*
    Then I see the *Delete lesson* modal
    When I click the *Delete* button
    Then the modal closes
    	And I am back at *Coach - '<class>' > Lessons* page
      And the snackbar notification appears
      And I no longer see the lesson in the *Lessons* table

  Scenario: Coach can filter lessons by status
  	Given I am at *Coach > Lessons*
    When I look at the *Status* filter
    Then I can see that it is set to *All* by default
    When I select any of the other two statuses (*Visible*, *Not visible*)
    Then I see only lessons with the selected status
    When there are no lessons with the selected status
    Then I see the *No results* text in the table

  Scenario: Coach filter lessons by recipients
    Given I am at *Coach > Lessons*
    When I look at the *Recipients* filter
    Then I can see that it is set to *All* by default
    When I select any of the available options
    Then I see only lessons assigned to the selected recipient(s)
    When there are no lessons with the selected recipient(s)
    Then I see the *No results* text in the table
