<template>

  <div class="searchbar" role="search">
    <mat-svg class="icon" category="action" name="search" aria-hidden="true"/>
    <mat-svg
      class="clearicon"
      category="content"
      name="clear"
      aria-hidden="true"
      @click="clearSearchTerm()"
    />
    <input
      :aria-label="$tr('searchLabel')"
      :placeholder="$tr('searchPlaceholder')"
      :value="value"
      @input="updateSearchTerm($event.target.value)"
      type="search"
    />
  </div>

</template>


<script>

  export default {
    name: 'searchBar',
    props: {
      value: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        searchTerm: '',
      };
    },
    methods: {
      updateSearchTerm(text) {
        this.searchTerm = text;
        this.$emit('input', text);
      },
      clearSearchTerm() {
        this.updateSearchTerm('');
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
    width: calc(100% - 50px)
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

  .clearicon
    display: inline-block
    float: right
    position: relative
    fill: $core-text-annotation
    top: 5px
    right: 5px
    cursor: pointer

  .searchbar
    border-radius: 5px
    padding: inherit
    border: 1px solid #c0c0c0
    margin-left: 5px
    width: 100%
    height: 2.5em

  @media screen and (min-width: $portrait-breakpoint + 1)
    .searchbar
      font-size: 0.9em

  @media screen and (max-width: 840px)
    .searchbar
      font-size: 0.9em
      width: 100%
      margin-top: 5px

</style>
