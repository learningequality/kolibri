<template>

  <CategorySearchOptions
    ref="searchOptions"
    :selectedCategory="selectedCategory"
    v-on="$listeners"
  />

</template>


<script>

  import CategorySearchOptions from './CategorySearchOptions';

  export default {
    name: 'CategorySearchModal',
    components: {
      CategorySearchOptions,
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
  };

</script>
