Feature: Sorting user tables

  Background:
    Given I am signed in as an admin
			And there are users who joined the facility using the *Change facility* option

	Scenario: Default sorting at *Facility > Users* #NOT IMPLEMENTED
		When I go to *Facility > Users*
		Then I see that the default sorting on page load is by *Full name*, ascending

	Scenario: Sort by *Date created* in *Facility > Users* #NOT IMPLEMENTED
		When I go to *Facility > Users*
			And I sort by *Date created*
		Then I see all users sorted by *Date created* ascending

	Scenario: Sort by *Date added* in *Facility > Users* #NOT IMPLEMENTED
		When I go to *Facility > Users*
			And I sort by *Date added*
		Then I see all users sorted by *Date added* ascending

	Scenario: Default sorting at *Device > Device permissions* #NOT IMPLEMENTED
		When I go to *Device > Device permissions*
		Then I see that the default sorting on page load is by *Full name*, ascending

	Scenario: Sort by *Date created* in *Device > Device permissions* #NOT IMPLEMENTED
		When I go to *Device > Device permissions*
			And I sort by *Date created*
		Then I see all users sorted by *Date created* ascending

	Scenario: Sort by *Date added* in *Device > Device permissions* #NOT IMPLEMENTED
		When I go to *Device > Device permissions*
			And I sort by *Date added*
		Then I see all users sorted by *Date added* ascending

	Scenario: Position of sort icon for text-only data fields
		Given I am at *Facility > Users* or *Device > Device permissions* #NOT IMPLEMENTED
		When I look at a column with text-only data fields
		Then I see that the column is left-aligned
			And I see that the icon is to the right of the column label

	Scenario: Position of sort icon for numeric-only data fields #NOT IMPLEMENTED
		Given I am at *Facility > Users* or *Device > Device permissions*
		When I look at a column with numeric-only data fields
		Then I see that the column is right-aligned
			And I see that the icon is to the left of the column label

	Scenario: Empty Gender, Identifier or Birth year fields
		Given I am at *Facility > Users*
		When I look at any of the following columns: *Gender*, *Identifier* or *Birth year*
			And there are no values specified
		Then I see a *-* representing the not specified value
