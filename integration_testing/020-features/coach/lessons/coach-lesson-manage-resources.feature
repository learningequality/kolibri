Feature: Coach manages lesson resources
   Coaches need to be able to manage (add more, reorder and remove) the resources in a lesson according to their needs

  Background:
    Given I am signed in to Kolibri as a coach
    	And there are imported channels with resources
      And I am at *Coach - '<class>' > Lessons > '<lesson>'* page
      And there is a lesson with resources
      And I have several bookmarked resources

  Scenario: Coach can open and view the *Manage lesson resources* side panel
		When I click on the *Manage resources* button
		Then I see the *Manage lesson resources* side panel
			And I see the *Select from bookmarks* label and the *Bookmarks* card below it
			And I see a *Search* button next to the *Select from bookmarks* label
			And I see the *Select from channels* card label and the channel cards for the available channels below it
			And I see a disabled *Save & finish* button at the lower right corner of the panel
		When I click the *Close* icon
		Then I am back at the lesson page

  Scenario: Coach can add a bookmarked resource to a lesson
		Given I am viewing the *Manage lesson resources* side panel
			And I see the *Bookmarks* card
		When I click on the *Bookmarks* card
		Then I see a list of my bookmarked resources with a checkbox for each one of them
		When I select one or several bookmarked resources
		Then I see the *N resource(s)selected (N MB)* link to the left of the *Save & finish* button
		When I click the *Save & finish* button
		Then I am back at the *Coach > <class> > Lesson > <lesson>* page
			And I see a *N resource(s) added* snackbar message
			And I can see that the selected resources are added to the list with lesson resources

	Scenario: Coach can add resources to a lesson
		Given I am viewing the *Manage lesson resources* side panel
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

	Scenario: Coach can preview a resource and add it to the lesson
		Given I am viewing the *Manage lesson resources* side panel
			And I can see a list with resources
		When I click on a resource
		Then I am able to preview the resource
		When I click the *Select resource* button above the resource
		Then the button changes to *Remove*
			And I see a green check mark and *Selected* to the left of it
		When I click the *Save & finish* button
		Then I am back at the *Coach > <class> > Lesson > <lesson>* page
			And I see a *N resource(s) added* snackbar message
			And I can see that the selected resources are added to the list with lesson resources

	Scenario: Coach can view and remove selected resources
		Given I am viewing the *Manage lesson resources* side panel
			And I have already selected several resources
		When I click the *N resource(s)selected (N MB)* link to the left of the *Save & finish* button
		Then I see the *N resources selected* page
			And I see the lesson name and the total side of the selected resources
			And I see a list with the resources with a folder icon and a remove icon for each resource
    When I click on the remove icon for a resource
    Then I can see that it's removed from the list
    When I click on the folder next to a resource
    Then I go to the parent folder of the resource
    	And I can see that the resource is selected
    When I click the *Save & finish* button
		Then I am back at the *Coach > <class> > Lesson > <lesson>* page
			And I see a *N resource(s) added* snackbar message
			And I can see that the selected resources are added to the list with lesson resources

	Scenario: Coach can search for resources by entering a keyword
		Given I am viewing the *Manage lesson resources* side panel
			And I can see a list with resources
		When I click on the *Search* button
		Then I see a *Search by keyword* field
			And I see the following filters: *Activities*, *Category*,  *Language*, *Level*, *Accessibility*, *Show resources*
			And I see that the *Category* filter is expanded by default
		When I enter a keyword
			And I click the search icon or press the *Enter* key
		Then I see a list with the search results
			And I see the number of results as *N results*
			And I see the keyword with an option to remove it
			And I see a *Clear all* label next to it
		When I select one or several of the available results
			And I click the *Save & finish* button
		Then I am back at the *Coach > <class> > Lesson > <lesson>* page
			And I can see that the selected resources are added to the list with lesson resources

	Scenario: Coach can search for resources by applying any of the available filters
		Given I am viewing the search and filters for the lesson resources
		When I select a value from any of the available filters
		Then I see a list with search results matching the applied filter
			And I see the number of results as *N results*
			And I see the applied filter with an option to remove it
			And I see a *Clear all* label next to it
		When I select one or several of the available results
			And I click the *Save & finish* button
		Then I am back at the *Coach > <class> > Lesson > <lesson>* page
			And I can see that the selected resources are added to the list with lesson resources

  Scenario: Reorder resources in the lesson by mouse drag and drop
    When I move the cursor over a resource under the *Resources* heading
    Then it transforms to a hand
    When I drag and drop a resource up or down
    Then the *Resource order saved* snackbar notification appears
      And I see the resource in the new position

  Scenario: Reorder resources in the lesson by keyboard
    When I use the TAB key to focus the resource
    Then I see the focus ring around either up or down arrow
    When I press the ENTER or SPACEBAR key
    Then the *Resource order saved* snackbar notification appears
      And I see the resource in the new position
