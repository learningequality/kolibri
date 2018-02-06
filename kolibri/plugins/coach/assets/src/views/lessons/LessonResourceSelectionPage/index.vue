<template>

  <div>
    <ui-toolbar
      title="Select Resources"
      textColor="white"
      type="colored"
      class="immersive-header"
    >
      <div slot="icon">
        <router-link :to="lessonPage">
          <mat-svg
            class="exit-button"
            category="navigation"
            name="close"
          />
        </router-link>
      </div>
    </ui-toolbar>

    <div class="immersive-content">
      <h1 class="selection-header"> Add resources to your lesson </h1>

      <search-box />

      <k-breadcrumbs
        :items="selectionCrumbs"
        :showAllCrumbs="true"
      />

      Lesson Resource Selection Page
    </div>
  </div>

</template>


<script>

  import uiToolbar from 'keen-ui/src/UiToolbar';
  import kBreadcrumbs from 'kolibri.coreVue.components.kBreadcrumbs';
  import { LessonsPageNames } from '../../../lessonsConstants';
  import searchBox from '../../../../../../learn/assets/src/views/search-box/';
  export default {
    components: {
      uiToolbar,
      kBreadcrumbs,
      searchBox,
    },
    computed: {
      lessonPage() {
        return {
          name: LessonsPageNames.SUMMARY,
          params: {
            classId: this.classId,
            lessonId: this.lessonId,
          },
        };
      },
      selectionCrumbs() {
        const channelBreadcrumbObject = {
          text: this.$tr('channelBreadcrumbLabel'),
          link: {
            name: LessonsPageNames.SELECTION_ROOT,
            params: {
              lessonId: this.lessonId,
              classId: this.classId,
            },
          },
        };
        return [channelBreadcrumbObject, ...this.ancestors];
        // just include "channel" at first, bring in topics/more as the routes change
      },
    },
    methods: {},
    vuex: {
      getters: {
        lessonId: state => state.pageState.currentLesson,
        classId: state => state.classId,
        // ancestors: state => state.pageState.ancestors,
        ancestors: () => [],
      },
      actions: {},
    },
    $trs: {
      channelBreadcrumbLabel: 'Channels',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .exit-button
    fill: white
    margin-left: 0.5em
    font-size: 1rem

  .immersive
    &-header
      position: fixed
      left: 0
      right: 0
      top: 0
    &-content
      margin-top: 58px // height of action bar
      padding: 2em

</style>
