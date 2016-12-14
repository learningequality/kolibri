<template>

  <div class="main-wrapper">

    <!-- search block -->
    <div class="top-floating-bar" role="search">
      <div class="table-wrapper">
        <div class="table-row">
          <div class="input-table-cell">
            <input
              type="search"
              ref="search"
              aria-label="Type to find content"
              placeholder="Find content..."
              autocomplete="off"
              v-focus="searchOpen"
              v-model="localSearchTerm"
              id="search"
              name="search"
              @keyup="search()"
              @keydown.esc.prevent="clear()"
            >
            <button
              aria-label="Reset"
              class="reset"
              type="reset"
              @click="clear()"
              :style="{ visibility: localSearchTerm ? 'inherit' : 'hidden' }"
            >
              <svg class="clear-icon" src="./clear.svg"></svg>
            </button>
          </div>
          <div class="cancel-btn-table-cell">
            <button @click="toggleSearch" class="search-btn">Cancel</button>
          </div>
        </div>
      </div>
    </div>

    <!-- results -->
    <div class="results" v-if="!loading">
      <h1 v-if="searchTerm">
        {{ message }}
      </h1>

      <h2 v-if="topics.length && showTopics">
        Topic
      </h2>

      <card-list class="card-list" v-if="topics.length && showTopics">
        <topic-list-item
          v-for="topic in topics"
          class="card"
          :id="topic.id"
          :channelid="channelId"
          :title="topic.title"
          :ntotal="topic.n_total"
          :ncomplete="topic.n_complete">
        </topic-list-item>
      </card-list>

      <h2 v-if="contents.length">
        Content
      </h2>

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
  const throttle = require('lodash.throttle');


  module.exports = {
    $trNameSpace: 'learnSearch',

    $trs: {
      ariaLabel: 'Type to find content',
      placeHolder: 'Find content...',
    },
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
    mounted() {
      this.localSearchTerm = this.searchTerm;
    },
    computed: {
      message() {
        if ((this.showTopics && this.topics.length) || this.contents.length) {
          return 'Search results:';
        } else if (!(this.showTopics && this.topics.length) &&
          !this.contents.length) {
          return 'Could not find any matches.';
        }
        return '';
      },
      ariaLabel() {
        return this.$tr('ariaLabel');
      },
      placeHolder() {
        return this.$tr('placeHolder');
      },
    },
    methods: {
      clear() {
        if (!this.localSearchTerm) {
          this.toggleSearch();
        } else {
          this.localSearchTerm = '';
          this.$refs.search.focus();
          this.triggerSearch(this.localSearchTerm);
        }
      },

      triggerSearchAction() {
        this.triggerSearch(this.localSearchTerm);
      },

      search: throttle(function search() {
        this.triggerSearchAction();
      }, 500),
    },
    components: {
      'topic-list-item': require('../topic-list-item'),
      'content-grid-item': require('../content-grid-item'),
      'card-grid': require('../card-grid'),
      'card-list': require('../card-list'),
    },
    vuex: {
      getters: {
        contents: state => state.searchState.contents,
        topics: state => state.searchState.topics,
        loading: state => state.searchLoading,
        searchTerm: state => state.searchState.searchTerm,
        searchOpen: state => state.searchOpen,
        channelId: (state) => state.core.channels.currentId,
      },
      actions: {
        triggerSearch: actions.triggerSearch,
        toggleSearch: actions.toggleSearch,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'
  @require '../learn.styl'

  $top-offset = 60px

  h2
    margin-top: 2em
    font-size: 1em

  .card-list
    margin-bottom: $card-gutter

  .main-wrapper
    margin: auto
    width-auto-adjust()

  .top-floating-bar
    background-color: $core-bg-canvas
    height: $learn-toolbar-height
    padding-top: 0.5em
    z-index: 10000
    text-align: center
    position: fixed
    top: 0
    width-auto-adjust()
    @media screen and (max-width: $portrait-breakpoint)
      padding: 0.5em 0
      text-align: center

  .table-wrapper
    margin: auto
    width: 80%
    max-width: 800px
    display: table
    @media screen and (max-width: $medium-breakpoint)
      width: 100%
    @media screen and (max-width: $portrait-breakpoint)
      width: $horizontal-card-width


  .table-row
    position: relative
    display: table-row

  .input-table-cell
    display: table-cell
    position: relative
    width: 100%

  input
    width: 100%
    display: inline-block
    height: 26px
    border: 1px solid $core-text-annotation
    border-radius: 4px
    padding: 0.3em 1em
    vertical-align: middle
    box-sizing: border-box
    font-size: 0.9em
    background-color: $core-bg-canvas
    &:focus
      margin: 0 auto

  .reset
    position: absolute
    right: 3px
    top: 2px
    border: none
    background-color: $core-bg-canvas // IE10 needs a non-transparent bg to be clickable
    padding: 0 4px
    height: 22px
    outline-offset: -2px
    svg
      fill: $core-text-annotation
      position: relative
      top: -2px

    &:focus // Removing border in FF removes outline too (Normalize?)
      outline: 2px solid $core-action-light

  .cancel-btn-table-cell
    display: table-cell
    padding-left: $card-gutter
    @media screen and (min-width: $portrait-breakpoint + 1)
      padding-right: $card-gutter

  .search-btn
    height: 26px
    width: 60px
    padding: 0.2em 0.7em
    border-radius: 4px
    font-size: 0.8em
    border: 1px solid $core-text-annotation
    color: $core-text-annotation

  .results
    padding-top: $top-offset
    padding-bottom: 100px

  .clear-icon
    width: 15px
    height: 15px

</style>
