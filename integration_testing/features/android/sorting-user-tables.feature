Feature: Sorting user tables

  Background:
    Given I am signed in as an admin
			And I am viewing the *Users* table at *Facility > Users*
			And there are users who joined the facility using the *Change facility* option

	Scenario: Sort by date created in Facility > Users

	Scenario: Sort by date added in Facility > Users

	Scenario: Sort by date created in Device > Device permissions

	Scenario: Sort by date added in Device > Device permissions

	Scenario: Position of sort icon for text-only data fields
	# Column is left-aligned, icon is to the right of the column label

	Scenario: Position of sort icon for numeric-only data fields
	# Column is right-aligned, icon is to the left of the column label
