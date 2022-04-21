Feature: Sorting user tables

  Background:
    Given I am signed in as an admin
			And there are users who joined the facility using the *Change facility* option

	Scenario: Default sorting at *Facility > Users*
		When I go to *Facility > Users*
		Then I see that the default sorting on page load is by *Full name*, ascending

	Sort by *Date created* in *Facility > Users*
		When I go to *Facility > Users*
			And I sort by *Date created*
		Then I see all users sorted by *Date created* ascending

	Scenario: Sort by *Date added* in *Facility > Users*

	Scenario: Sort by *Date created* in *Device > Device permissions*

	Scenario: Sort by *Date added* in *Device > Device permissions*

	Scenario: Position of sort icon for text-only data fields
	# Column is left-aligned, icon is to the right of the column label

	Scenario: Position of sort icon for numeric-only data fields
	# Column is right-aligned, icon is to the left of the column label
