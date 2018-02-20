<template>

  <div>
    <section class="lesson-details">
      <div>
        <h1 class="title">
          {{ currentLesson.name }}
          <progress-icon v-if="lessonHasResources" :progress="lessonProgress" />
        </h1>
      </div>
      <div v-if="currentLesson.description!==''">
        <h3>{{ $tr('teacherNote') }}</h3>
        <p> {{ currentLesson.description }}</p>
      </div>
    </section>

    <section>
      <content-card
        v-for="c in contentNodes"
        :key="c.pk"
        class="content-card"
        :isMobile="true"
        :kind="c.kind"
        :link="lessonResourceViewerLink(c.pk)"
        :progress="c.progress_fraction"
        :thumbnail="getContentNodeThumbnail(c)"
        :title="c.title"
      />

      <p v-if="!lessonHasResources" class="no-resources-message">
        {{ $tr('noResourcesInLesson') }}
      </p>
    </section>
  </div>

</template>


<script>

  import sumBy from 'lodash/sumBy';
  import ProgressIcon from 'kolibri.coreVue.components.progressIcon';
  import ContentCard from '../content-card';
  import { lessonResourceViewerLink } from './classPageLinks';

  // TODO Make this utility
  function getContentNodeThumbnail(contentnode) {
    const fileWithThumbnail = contentnode.files.find(file => file.thumbnail && file.available);
    if (fileWithThumbnail) {
      return fileWithThumbnail.storage_url;
    }
    return null;
  }

  export default {
    name: 'lessonPlaylistPage',
    components: {
      ContentCard,
      ProgressIcon,
    },
    computed: {
      lessonHasResources() {
        return this.contentNodes.length > 0;
      },
      lessonProgress() {
        if (this.lessonHasResources) {
          // HACK: Infer the Learner's progress by summing the progress_fractions
          // on all the ContentNodes
          const total = sumBy(this.contentNodes, cn => cn.progress_fraction || 0);
          return total / this.contentNodes.length;
        }
      },
    },
    methods: {
      getContentNodeThumbnail,
      lessonResourceViewerLink,
    },
    vuex: {
      getters: {
        contentNodes: state => state.pageState.contentNodes,
        currentLesson: state => state.pageState.currentLesson,
      },
    },
    $trs: {
      teacherNote: 'Teacher note:',
      noResourcesInLesson: 'There are no resources in this lesson!',
    },
  };

</script>


<style lang="stylus" scoped>

  .lesson-details
    margin-bottom: 32px

  .title
    display: inline-block

  .content-card
    margin-bottom: 16px
    max-width: 800px

  .no-resources-message
    text-align: center
    font-weight: bold
    padding: 48px 0

</style>
