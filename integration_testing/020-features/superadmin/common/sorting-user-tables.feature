Feature: Sorting user tables

  Background:
    Given I am signed in as a super admin or an admin
    	And I am at *Facility > Users*
			And I have already created or imported multiple users

	Scenario: Default sorting at *Facility > Users*
		When I look at the *Users* table
		Then I see that the default sorting is by *Full name*, ascending #Run the same scenario for the *New users* table and for the *Deleted users*

	Scenario: Sorting is functioning correctly for all of the *Users* table columns
		When I look at the *Users* table
		Then I can see the following columns: Full name, Username, Identifier, Gender, Birth year, Created at
		When I sort by each of the available columns
		Then I see that all users are correctly sorted by the applied sorting #Run the same scenario for the *New users* table

	Scenario: Sorting is functioning correctly for all of the *Deleted users* table columns
		Given I am at *Facility > Users > Deleted users*
			And there are multiple deleted users
		When I look at the *Deleted users* table
		Then I can see the following columns: Full name, Username, Identifier, Gender, Birth year, Permanent deletion
		When I sort by each of the available columns
		Then I see that all users are correctly sorted by the applied sorting

	Scenario: Default sorting at *Device > Device permissions*
		When I go to *Device > Permissions*
		Then I see that the default sorting on page load is by *Full name*, ascending
