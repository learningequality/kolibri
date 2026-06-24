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
       * Focuses on the correct first element for FocusTrap depending on content rendered in
       * the search modal.
       * @public
       */
      focusFirstEl() {
        this.$refs.searchOptions.$el.querySelector('.filter-list-title > h2 > a').focus();
      },
    },
  };

</script>
