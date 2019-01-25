
# Style guide for Kolibri `.feature` files

The purpose of this document is to compile and keep the record of our internal conventions used to write and format the `.feature` files for testing Kolibri. 

Style guide is a `Work-In-Progress` as we keep adding the testing scenarios and refining our strategies.

## File naming

- Use the `role-name-feature-name.feature` naming strategy.
- Feature name part should be expressed as **action** whenever possible, instead of the *need*. Examples: `move-learners-between-groups`, or `modify-facility-settings`. Do not use verbs as *can* or *should* in filenames.
- Separate all filename parts with dashes `-`, not underscores `_`. 

## Feature naming

Feature name and description (the first part of the content inside the `.feature` file), should express the **need**. Try to formulate the name as: "This `role-name` needs to be able to achieve `feature-name`". Add more detailed background explanation if needed. Most feature descriptions can be expressed in one sentence, but other, more complex ones that include various `Background` settings or `Scenarios` might need more than one sentence.

## Other recommendations

- List the `Background` "givens" in order to cover the more general conditions **first** (`there are groups created`, meaning that the groups should be created even before the user arrived to the groups page), and the more specific ones (`I am on *Coach > Groups* page`)
- Keep the *point of view* consistent by writing all the steps as **I**.
- Use present tense and avoid conditionals: *When I scroll... Then I see...* instead of *When I have scrolled... Then I should see...*
- Whenever possible and not too laborious, let's try recording the values in `Examples` table and use the placeholders `<>`in the steps: 

	```
	Examples:
	| username | password |
	| coach    | coach    |
	```


## UI elements conventions

- Enclose strings of **all** the UI elements (buttons, menu options, headings, modal titles, etc.) inside `**` chars.
- Capitalize just the first letter (even when they appear fully capitalized in the UI, for readability purposes).
- Use the `*Plugin name > Tab name*` convention for indicating the current or position or the desired destination of the user in Kolibri. Examples: `*Coach > Groups*`, `*Learn > Recommended*`, `*Facility > Settings*`, `*Device > Info*`, etc.


## Some useful BDD resources

- [How to describe user stories using Gherkin language](https://medium.com/@SteelKiwiDev/how-to-describe-user-stories-using-gherkin-language-8cffc6b888df)
- [Gherkin Syntax](http://docs.behat.org/en/v2.5/guides/1.gherkin.html#gherkin-syntax)
- [Obey the testing goat BDD](https://www.obeythetestinggoat.com/book/appendix_bdd.html#_writing_an_ft_as_a_feature_using_gherkin_syntax)
- [Gherkin Reference](https://docs.cucumber.io/gherkin/reference/)
- [Gherkin: Feature Testing Language](http://behave.readthedocs.io/en/latest/gherkin.html#features)
- [Syntax formatter for Sublime](https://packagecontrol.io/packages/Gherkin%20(Cucumber)%20Formatter)