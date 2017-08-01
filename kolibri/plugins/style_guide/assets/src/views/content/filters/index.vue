<template>

  <component-template
      class="filter-style-guide"
      :codeExamplesTemplate="codeExamplesTemplate"
      :api="api"
      :requirePath="requirePath">

    <h1 slot="title">Filters</h1>
    <p slot="summary">
      Filters are used to display certain data types within a larger data
      collection
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
          Filters don’t disappear when other filters are applied
        </li>
        <li>
          Filters will apply until they are cleared/toggled off/navigated away
          from
        </li>
        <li>
          If there aren’t any items/content types available to show, show the
          filter but have it disabled
        </li>
      </ul>

      <h3>Types of filters</h3>
      <ul>
        <li>
          Text
          <ul>
              <li>
                Text filters will search for and show any results for the
                provided keyword
              </li>
          </ul>
        </li>
        <li>
          Bounded single select
          <ul>
            <li>
              A user can select a single option from a list of a finite options
            </li>
          </ul>
        </li>
        <li>
          Unbounded single select (not yet used)
          <ul>
            <li>
              A user can select a single option from a list of a variable amount
              of options
            </li>
          </ul>
        </li>
        <li>Bounded multi-select (not yet used)</li>
        <li>Unbounded multiselect (not yet used)</li>
      </ul>

      <h3>Specifications</h3>
      <ul>
        <li>
          Filter components should always be left aligned to the page
        </li>
        <li>
          Filters should be floating directly above the content that it is
          intended to filter through
        </li>
        <li>
          Filters should be spaced 8px apart from one another
        </li>
        <li>
          Filter option verbiage should not be long sentences and instead be 1-2
          words depicting the filter data type (e.g. coach, user, HTML apps)
        </li>
        <li>
          The first filter option is always selected by default
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
          example would be a search filter
        </li>
        <li>
          (text filter) Upon navigating to another page and going back, the
          filter field should clear itself
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

  </component-template>

</template>


<script>

  // Globally register the Kolibri components to make them accessible in the
  // Vuep renderer. This has to be done on the compiler-included version of Vue
  // because that's what Vuep uses to dynamically render template.
  import FullVue from 'vue/dist/vue.common';
  import componentTemplate from '../../shell/component-template';
  import UiSelect from 'keen-ui/src/UiSelect';
  import UiSelectApi from '!vue-doc!keen-ui/src/UiSelect';
  FullVue.component('ui-select', UiSelect);

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
      <div class="search-bar" role="search">
        <mat-svg class="icon" category="action" name="search" aria-hidden="true"/>
        <span class="search-icon"></span>
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
      // textbox: require('keen-ui/src/UiSelect')
    }
  };
  </${script}>
  `;

  export default {
    components: {
      componentTemplate,
    },
    data: () => ({
      codeExamplesTemplate,
      api: UiSelectApi,
      requirePath: 'keen-ui/src/UiSelect',
    }),
  };

</script>


<style lang="stylus">

  .filter-style-guide
    .vuep-preview
      height: 400px

    .dropdown-filter-examples
      display: flex

      .dropdown-filter-example
        width: 300px
        margin: 0 2em

      .ui-select
        max-width: 200px

    .text-filter-example
      margin: 0 2em

      .search-bar
        border-radius: 5px
        padding: 5px
        border: 1px solid #c0c0c0
        width: 300px

        .search-icon
          display: inline-block
          vertical-align: middle
          opacity: 0.5
          height: 24px
          width: 24px
          background: url("data:image/svg+xml;utf8,<svg fill='#000000' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'/><path d='M0 0h24v24H0z' fill='none'/></svg>")

        input
          width: 80%
          border: none

</style>
