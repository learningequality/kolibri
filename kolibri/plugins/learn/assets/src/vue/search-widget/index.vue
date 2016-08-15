<template>

  <div class='wrapper'>

    <!-- search block -->
    <div class='top' role="search">
      <div class="top-wrapper">
        <div class="input-wrapper">
          <input
            type="search"
            v-el:search
            aria-label="Type to find content"
            placeholder="Find content..."
            autocomplete="off"
            v-focus="searchOpen"
            v-model="localSearchTerm"
            id="search"
            name="search"
            @keyup="search() | debounce 500"
            @keydown.esc.prevent="clear()">
        </div>
        <search-button class='search-btn'>Cancel</search-button>
      </div>
    </div>

    <!-- results -->
    <div class='results' v-if="!loading">
      <h4 v-if="searchTerm">
        {{ message }}
      </h4>

      <card-grid v-if="topics.length && showTopics">
        <topic-list-item
          v-for="topic in topics"
          class="card"
          :id="topic.id"
          :title="topic.title"
          :ntotal="topic.n_total"
          :ncomplete="topic.n_complete">
        </topic-list-item>
      </card-grid>

      <card-grid v-if="contents.length">
        <content-grid-item
          v-for="content in contents"
          class="card"
          :title="content.title"
          :thumbnail="content.thumbnail"
          :kind="content.kind"
          :progress="content.progress"
          :id="content.id">
        </content-grid-item>
      </card-grid>
    </div>

  </div>

</template>


<script>

  const focus = require('vue-focus').focus;
  const actions = require('../../actions');


  module.exports = {
    directives: { focus },
    props: {
      showTopics: {
        type: Boolean,
        default: true,
      },
    },
    data() {
      return {
        localSearchTerm: '',
      };
    },
    computed: {
      message() {
        if (this.topics.length || this.contents.length) {
          return 'Search results:';
        } else if (!this.topics.length && !this.contents.length) {
          return 'Could not find any matches.';
        }
        return '';
      },
    },
    methods: {
      clear() {
        if (!this.localSearchTerm) {
          this.toggleSearch();
        } else {
          this.localSearchTerm = '';
          this.$els.search.focus();
          this.triggerSearch(this.localSearchTerm);
        }
      },
      search() {
        this.triggerSearch(this.localSearchTerm);
      },
    },
    components: {
      'topic-list-item': require('../topic-list-item'),
      'content-grid-item': require('../content-grid-item'),
      'search-button': require('./search-button'),
      'card-grid': require('../card-grid'),
    },
    vuex: {
      getters: {
        contents: state => state.searchState.contents,
        topics: state => state.searchState.topics,
        loading: state => state.searchLoading,
        searchTerm: state => state.searchState.searchTerm,
        searchOpen: state => state.searchOpen,
      },
      actions: {
        triggerSearch: actions.triggerSearch,
        toggleSearch: actions.toggleSearch,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  @require '../learn.styl'

  $top-offset = 120px

  .wrapper
    margin: auto
    width-auto-adjust()

  .results
    padding-top: $top-offset
    @media screen and (max-width: $portrait-breakpoint)
      margin-left: $card-gutter

  .top
    background-color: $core-bg-canvas
    height: $top-offset
    padding-top: 4rem
    z-index: 10000
    text-align: center
    position: fixed
    top: 0
    width-auto-adjust()
    @media screen and (max-width: $portrait-breakpoint)
      text-align: left
      padding-right: 10px
  .input-wrapper
  .top-wrapper
    position: relative
    display: block
    height: 100%
    width: 90%
    margin: auto
    @media screen and (max-width: $portrait-breakpoint)
      left: 15px

    @media screen and (max-width: $portrait-breakpoint)
      padding-left: 3.4em

  input
    display: inline-block
    border: 1px solid #ccc
    box-shadow: inset 0 1px 3px #ddd
    border-radius: 2em
    padding: 0.5em 1em
    vertical-align: middle
    box-sizing: border-box
    width: 75%
    &:focus
      outline: none
      border-color: $core-text-annotation

    // prevent IE10 from showing a duplicated 'x'  clear icon
    &::-ms-clear
      display: none

  .reset
    border: none
    background-color: $core-bg-light // IE10 needs a non-transparent bg to be clickable
    display: inline-block
    outline: none
    cursor: pointer
    position: relative
    top: 1px
    right: 40px
    padding: 4px
    svg
      fill: $core-text-annotation
      height: 15px
      width: 15px
  .search-btn
    background: url('search.svg') no-repeat center
    position: absolute
    top: 0.1rem
    right: 2.3rem
    z-index: 10001
    @media screen and (max-width: $portrait-breakpoint)
      background: url('back.svg') no-repeat center
      left: 1.3em
      top: 0.3em

</style>
