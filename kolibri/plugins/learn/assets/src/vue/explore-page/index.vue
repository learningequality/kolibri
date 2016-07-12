<template>

  <search-widget :searchtoggled.sync="searchToggled"></search-widget>

  <div class="tool-bar">

    <breadcrumbs
      v-if='!isRoot'
      class='breadcrumbs'
      :rootid='rootTopicId'
      :crumbs='topic.breadcrumbs'
      :current='topic.title'>
    </breadcrumbs>

    <div class="search-tools">

      <select class="channel-select" transition="fast">
        <option value="khan">Khan Academy</option>
        <option value="ck12">CK-12</option>
      </select>

      <label @click="searchToggleSwitch(true)" for="search">
        <img alt="search" class="btn-search-img" src="../search-widget/images/search.svg">
      </label>

    </div>
  </div>

  <!-- Toggles top margin if sidebar overlay is exposed -->
  <section class="explore">

    <p v-if='topic.description'>
      {{ topic.description }}
    </p>

    <card-grid :header="isRoot ? 'Topics' : '' " v-if="subtopics.length">
      <topic-card
        v-for="topic in subtopics"
        :id="topic.id"
        :title="topic.title"
        :ntotal="topic.n_total"
        :ncomplete="topic.n_complete">
      </topic-card>
    </card-grid>

    <card-grid :header="isRoot ? 'Content' : '' " v-if="contents.length">
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

  </section>

</template>


<script>

  module.exports = {
    components: {
      'breadcrumbs': require('../breadcrumbs'),
      'topic-card': require('../topic-card'),
      'content-card': require('../content-card'),
      'search-widget': require('../search-widget'),
      'card-grid': require('../card-grid'),
    },
    data() {
      return {
        searchToggled: false,
      };
    },
    methods: {
      searchToggleSwitch(value) {
        this.searchToggled = value;
      },
    },
    vuex: {
      getters: {
        rootTopicId: state => state.rootTopicId,
        topic: state => state.pageState.topic,
        subtopics: state => state.pageState.subtopics,
        contents: state => state.pageState.contents,
        isRoot: (state) => state.pageState.topic.id === state.rootTopicId,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  @require '../learn'

  .tool-bar
    width-auto-adjust()
    position: fixed
    top: 0
    padding-top: ($tool-bar-height / 4)
    padding-bottom: ($tool-bar-height / 4)
    box-sizing: border-box
    background-color: $core-bg-canvas
    z-index: 1
  .breadcrumbs
    float: left
  .search-tools
    float: right
  .explore
    padding-top: $tool-bar-height

  .breadcrumbs
  .search-tools
    height: ($tool-bar-height / 2)

  select
    font-size: 0.8rem
    padding: 0
    position: relative
    top: -8px

  .fast-transition
    transition: all 0.3s ease-out
  .fast-enter
    opacity: 0
    transform: translateX(-50%)
  .fast-leave
    opacity: 0
    transform: translateX(-100%)

</style>
