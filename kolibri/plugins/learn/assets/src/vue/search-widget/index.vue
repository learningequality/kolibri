<template>

  <div class="wrapper">

    <!-- search block -->
    <div class="top">
      <input
        type="search"
        v-el:search
        placeholder="Find content..."
        autocomplete="off"
        v-focus="searchOpen"
        v-model="localSearchTerm"
        id="search"
        name="search"
        @keyup="search() | debounce 500"
        @keydown.esc.prevent="clear()">
      <button class="reset" type="reset" @click="clear()" :style="{ visibility: localSearchTerm ? 'inherit' : 'hidden' }">
        <svg height="24" viewbox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
          <path d="M0 0h24v24H0z" fill="none"></path>
        </svg>
      </button>
    </div>

    <!-- results -->
    <div class="results" v-if="!loading">
      <h4 v-if="searchTerm">
        {{ message }}
      </h4>

      <card-grid v-if="topics.length && showTopics">
        <topic-card
          v-for="topic in topics"
          class="card"
          :id="topic.id"
          :title="topic.title"
          :ntotal="topic.n_total"
          :ncomplete="topic.n_complete">
        </topic-card>
      </card-grid>

      <card-grid v-if="contents.length">
        <content-card
          v-for="content in contents"
          class="card"
          :title="content.title"
          :thumbnail="content.thumbnail"
          :kind="content.kind"
          :progress="content.progress"
          :id="content.id">
        </content-card>
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
      'topic-card': require('../topic-card'),
      'content-card': require('../content-card'),
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

  $top-offset = 70px

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
    padding-top: 1rem
    z-index: 10000
    text-align: center
    position: fixed
    top: 0
    width-auto-adjust()
    @media screen and (max-width: $portrait-breakpoint)
      text-align: left
      padding-right: 10px

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
    background-color: white // IE10 needs a non-transparent bg to be clickable
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

</style>
