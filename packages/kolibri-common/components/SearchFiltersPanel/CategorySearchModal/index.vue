<template>

  <CategorySearchOptions
    ref="searchOptions"
    :selectedCategory="selectedCategory"
    v-on="$listeners"
  />

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import CategorySearchOptions from './CategorySearchOptions';

  export default {
    name: 'CategorySearchModal',
    components: {
      CategorySearchOptions,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsLarge } = useKResponsiveWindow();
      return {
        windowIsLarge,
      };
    },
    props: {
      selectedCategory: {
        type: String,
        required: true,
        default: null,
      },
    },
    methods: {
      /**
       * @public
       * Focuses on correct first element for FocusTrap depending on content
       * rendered in the search modal.
       */
      focusFirstEl() {
        this.$refs.searchOptions.$el.querySelector('.filter-list-title > h2 > a').focus();
      },
    },
    $trs: {
      title: {
        message: 'Choose a category',
        context: 'Title of the category selection window',
      },
    },
  };

</script>
