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
       * Moves keyboard focus to the first interactive element inside the category search options.
       * @public
       */
      focusFirstEl() {
        this.$refs.searchOptions.$el.querySelector('.filter-list-title > h2 > a').focus();
      },
    },
  };

</script>
