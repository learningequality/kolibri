<template>

  <div class="selection-page">
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

      <content-card
        v-for="content in contentList"
        :key="content.id"
        :title="content.title"
        :thumbnail="content.thumbnail"
        :description="content.description"
        :kind="content.kind"
        :link="contentLink(content)"
      />
    </div>
  </div>

</template>


<script>

  import uiToolbar from 'keen-ui/src/UiToolbar';
  import contentCard from './content-card';
  import kBreadcrumbs from 'kolibri.coreVue.components.kBreadcrumbs';
  import { LessonsPageNames } from '../../../lessonsConstants';
  import searchBox from '../../../../../../learn/assets/src/views/search-box/';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';

  function getAncestorLink(ancestor, params) {
    return {
      text: ancestor.title,
      link: {
        name: LessonsPageNames.SELECTION,
        params,
      },
    };
  }

  export default {
    components: {
      uiToolbar,
      kBreadcrumbs,
      searchBox,
      contentCard,
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
        const defaultParams = {
          lessonId: this.lessonId,
          classId: this.classId,
        };
        const channelBreadcrumbObject = {
          text: this.$tr('channelBreadcrumbLabel'),
          link: {
            name: LessonsPageNames.SELECTION_ROOT,
            params: defaultParams,
          },
        };
        return [
          channelBreadcrumbObject,
          // TODO ancestors might be missing one link
          ...this.ancestors.map(a => getAncestorLink(a, { ...defaultParams, topicId: a.pk })),
        ];
        // just include "channel" at first, bring in topics/more as the routes change
      },
    },
    methods: {
      contentLink(content) {
        const defaultParams = {
          lessonId: this.lessonId,
          classId: this.classId,
        };
        if (content.kind === ContentNodeKinds.TOPIC || content.kind === ContentNodeKinds.CHANNEL) {
          return {
            name: LessonsPageNames.SELECTION,
            params: {
              ...defaultParams,
              topicId: content.id,
            },
          };
        }
        return {
          name: LessonsPageNames.CONTENT_PREVIEW,
          params: {
            ...defaultParams,
            contentId: content.id,
          },
        };
      },
    },
    vuex: {
      getters: {
        lessonId: state => state.pageState.currentLesson,
        classId: state => state.classId,
        ancestors: state => state.pageState.ancestors || [],
        contentList: state => state.pageState.contentList,
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
      z-index: 4 // material spec
    &-content
      position: absolute
      top: 58px // height of action bar
      left: 0
      right: 0
      bottom: 0
      overflow-y: scroll
      padding: 2em

</style>
