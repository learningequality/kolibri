<template>

  <PageTemplate title="Filters" :completed="false">

    <h3><code>{{ kFilterTextboxApi.name }}</code> API</h3>
    <ComponentDocs :api="kFilterTextboxApi" />

    <h3>Code Example</h3>
    <VueExample :code="kFilterTextboxExample" />


    <h3><code>{{ kSelectApi.name }}</code> API</h3>
    <ComponentDocs :api="kSelectApi" />

    <h3>Code Example</h3>
    <VueExample :code="kSelectExample" />

    <h3>Guidelines</h3>
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

  </PageTemplate>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import KFilterTextbox from 'kolibri.coreVue.components.KFilterTextbox';
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import ComponentDocs from '../../shell/ComponentDocs';
  import VueExample from '../../shell/VueExample';
  import PageTemplate from '../../shell/PageTemplate';
  import kFilterTextboxExample from 'raw-loader!./k-filter-textbox-example.html';
  import kFilterTextboxApi from '!vue-doc!kolibri.coreVue.components.KFilterTextbox';
  import kSelectExample from 'raw-loader!./k-select-example.html';
  import kSelectApi from '!vue-doc!kolibri.coreVue.components.KSelect';

  FullVue.component('k-filter-textbox', KFilterTextbox);
  FullVue.component('k-select', KSelect);

  export default {
    name: 'Filters',
    components: {
      PageTemplate,
      ComponentDocs,
      VueExample,
    },
    data: () => ({
      kFilterTextboxExample,
      kSelectExample,
      kFilterTextboxApi,
      kSelectApi,
    }),
  };

</script>


<style lang="scss" scoped></style>
