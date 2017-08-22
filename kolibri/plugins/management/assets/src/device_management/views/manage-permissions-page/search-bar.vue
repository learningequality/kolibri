<template>

  <div class="searchbar" role="search">
    <mat-svg class="icon" category="action" name="search" aria-hidden="true"/>
    <input
      :aria-label="$tr('searchLabel')"
      :placeholder="$tr('searchPlaceholder')"
      :value="value"
      @input="updateSearchTerm($event.target.value)"
      type="search"
    >
  </div>

</template>


<script>

  export default {
    name: 'SearchBar',
    props: {
      value: {
        type: String,
        required: true,
      },
    },
    data() {
      return { searchTerm: '' };
    },
    methods: {
      updateSearchTerm(text) {
        this.searchTerm = text;
        this.$emit('input', text);
      },
    },
    $trs: {
      searchLabel: 'Search for a user',
      searchPlaceholder: 'Search for a user...',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  // copy-pasted from user-page
  input[type='search']
    display: inline-block
    box-sizing: border-box
    position: relative
    top: 0
    left: 10px
    height: 100%
    width: 85%
    border-color: transparent
    background-color: transparent
    clear: both

  .searchbar .icon
    display: inline-block
    float: left
    position: relative
    fill: $core-text-annotation
    left: 5px
    top: 5px

  .searchbar
    border-radius: 5px
    padding: inherit
    border: 1px solid #c0c0c0
    width: 300px
    height: $toolbar-height
    float: left
    margin-left: 5px

  @media screen and (min-width: $portrait-breakpoint + 1)
    .searchbar
      font-size: 0.9em
      min-width: 170px
      width: 45%
    #search-field
      width: 80%

  @media screen and (max-width: 840px)
    .searchbar
      font-size: 0.9em
      width: 100%
      margin-top: 5px
      float: right

</style>
