<template>

  <div>
    <section class="lesson-details">
      <div>
        <h1 class="title">{{ currentLesson.name }}</h1>
      </div>
      <div v-if="currentLesson.description!==''">
        <h3>{{ $tr('teacherNote') }}</h3>
        <p> {{ currentLesson.description }}</p>
      </div>
    </section>

    <section class="lesson-content-cards">
      <content-card
        v-for="c in contentNodes"
        :key="c.pk"
        class="content-card"
        :isMobile="true"
        :kind="c.kind"
        :link="{}"
        :progress="c.progress_fraction"
        :thumbnail="getContentNodeThumbnail(c)"
        :title="c.title"
      />
    </section>
    <!-- <pre>
      {{ JSON.stringify(contentNodes, null, 2) }}
    </pre> -->
  </div>

</template>


<script>

  import ContentCard from '../content-card';

  // TODO Make this utility
  function getContentNodeThumbnail(contentnode) {
    const fileWithThumbnail = contentnode.files.find(file => file.thumbnail && file.available);
    if (fileWithThumbnail) {
      return fileWithThumbnail.storage_url;
    }
    return null;
  }

  export default {
    components: {
      ContentCard,
    },
    methods: {
      getContentNodeThumbnail,
    },
    vuex: {
      getters: {
        contentNodes: state => state.pageState.contentNodes,
        currentLesson: state => state.pageState.currentLesson,
      },
    },
    $trs: {
      teacherNote: 'Teacher note:',
    },
  };

</script>


<style lang="stylus" scoped>

  .lesson-details
    margin-bottom: 32px

  .title
    display: inline-block

  .lesson-content-cards
    max-width: 800px

  .content-card
    margin-bottom: 16px

</style>
