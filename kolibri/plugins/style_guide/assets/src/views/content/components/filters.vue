<template>

  <component-style-guide
      class="filter-style-guide"
      :codeExamplesTemplate="codeExamplesTemplate"
      :api="api">

    <h1 slot="title">Filters</h1>
    <p slot="summary">
      Text fields to allow the user to input data for submission. Use them for
      short length text and numeric input.
    </p>

    <div slot="guidelines-and-usage">
      <h3>How they behave together</h3>
      <ul>
        <li>
          Logical OR within a particular facet for facets supporting
          multi-select. This means the amount of content will increase if
          multiple things are selected within a particular facet.
        </li>
        <li>
          Logical AND between facets: This means the content will decrease when
          items between facets are selected.
        </li>
        <li>
          Filters don’t disappear when other filters are applied.
        </li>
        <li>
          Filters will apply until they are cleared/toggled off/navigated away
          from.
        </li>
        <li>
          If there aren’t any items/content types available to show, show the
          filter but have it disabled.
        </li>
      </ul>

      <h3>Types of filters</h3>
      <ul>
        <li>
          Text
          <ul>
              <li>
                Text filters will search for and show any results for the
                provided keyword.
              </li>
          </ul>
        </li>
        <li>
          Bounded single select
          <ul>
            <li>
              A user can select a single option from a list of a finite options.
            </li>
          </ul>
        </li>
        <li>
          Unbounded single select (not yet used)
          <ul>
            <li>
              A user can select a single option from a list of a variable amount
              of options.
            </li>
          </ul>
        </li>
        <li>Bounded multi-select (not yet used).</li>
        <li>Unbounded multiselect (not yet used).</li>
      </ul>

      <h3>Specifications</h3>
      <ul>
        <li>
          Filter components should always be left aligned to the page.
        </li>
        <li>
          Filters should be floating directly above the content that it is
          intended to filter through.
        </li>
        <li>
          Filters should be spaced 8px apart from one another.
        </li>
        <li>
          Filter option verbiage should not be long sentences and instead be 1-2
          words depicting the filter data type (e.g. coach, user, HTML apps).
        </li>
        <li>
          The first filter option is always selected by default.
        </li>
        <li>
          Upon navigating to another page and going back, the filter should
          reset to the first filter option. For keyword filters, the filter
          field should clear itself.
        </li>
        <li>
          Max width for dropdown filters: 200px
        </li>
        <li>
          (text filter) Filter results will populate as the user types. An
          example would be a search filter.
        </li>
        <li>
          (text filter) Upon navigating to another page and going back, the
          filter field should clear itself.
        </li>
        <li>
          (text filter) Min width: 240px
        </li>
        <li>
          (text filter) Max width: 540px
        </li>
        <li>
          (text filter) pressing esc will clear the text filter
        </li>
      </ul>

    </div>

  </component-style-guide>

</template>


<script>

  // Globally register the Kolibri components to make them accessible in the
  // Vuep renderer. This has to be done on the compiler-included version of Vue
  // because that's what Vuep uses to dynamically render template.
  const FullVue = require('vue/dist/vue.common');
  FullVue.component('ui-select', require('keen-ui/src/UiSelect'));

  // Define the examples as the initial content of the Vuep editor.
  // Notes: htmlhint would incorrectly warn about nested script tags, so we'd
  // need to work around it by dynamically constructing them.
  const script = 'script';
  const codeExamplesTemplate = `
<template>

  <div>
    <div class="dropdown-filter-examples">
      <div class="dropdown-filter-example">
        <h4>Normal</h4>
        <ui-select
            label="Show"
            :options="dropdownFilterOptions"
            v-model="currentDropdownFilter">
        </ui-select>
      </div>

      <div class="dropdown-filter-example">
        <h4>Disabled</h4>
        <ui-select
            disabled
            label="Show"
            :options="dropdownFilterOptions"
            v-model="currentDropdownFilter">
        </ui-select>
      </div>
    </div>

    <div class="text-filter-example">
      <h4>Text filter</h4>
      <div class="searchbar" role="search">
        <mat-svg class="icon" category="action" name="search" aria-hidden="true"/>
        <input
          type="search"
          :aria-label="'Search for a user'"
          :placeholder="'Search for a user'"
          v-model="searchFilter">
      </div>
    </div>
  </div>

</template>

<${script}>
  module.exports = {
    data: () => ({
      dropdownFilterOptions: [
        'All content',
        'Excercises',
        'Videos',
        'Audio'
      ],
      currentDropdownFilter: 'All content',
      searchFilter: ''
    }),
    components: {
      // textbox: require('keen-ui/src/UiTextbox')
    }
  };
</${script}>
`;

  module.exports = {
    components: {
      'component-style-guide': require('../../shell/component-style-guide'),
    },
    data: () => ({
      codeExamplesTemplate,
      api: require('!vue-doc!keen-ui/src/UiSelect') // eslint-disable-line
    })
  };

</script>


<style lang="stylus">

  .filter-style-guide
    .vuep-preview
      height: 55em

    .dropdown-filter-examples
      display: flex

      .dropdown-filter-example
        width: 300px
        margin: 0 2em

      .ui-select
        max-width: 200px

    .text-filter-example
      margin: 0 2em

      .searchbar
        border-radius: 5px
        padding: inherit
        border: 1px solid #c0c0c0
        width: 300px

        input
          width: 80%
          border: none
          margin: 5px

</style>
