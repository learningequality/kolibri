<template>

  <section>
    <!-- placeholder for learning activity kind chips TODO update with chip component -->

    <!-- for sibling in tree  -->
    <div v-if="!itemIsOnlyContent">
      <Item
        v-for="content in contents"
        :id="content.id"
        :key="content.id"
        :title="content.title"
        :currentContent="currentContent"
        :progress="content.progress"
        :kind="content.kind"
        :duration="content.duration"
      />
    </div>
    <div v-else class="no-content">
      <p v-if="content.isLeaf">
        {{ $tr('noOtherLessonResources') }}
      </p>
      <p v-else>
        {{ $tr('noOtherTopicResources') }}
      </p>
    </div>

  </section>

</template>


<script>

  // import { mapState, mapGetters } from 'vuex';
  import Item from './Item';

  export default {
    name: 'SidePanelResourcesList',
    components: {
      Item,
    },
    props: {
      contents: {
        type: Array,
        required: true,
      },
      currentContent: {
        type: Object,
        required: true,
      },
    },
    computed: {
      itemIsOnlyContent() {
        return this.contents.length === 1;
      },
    },
    $trs: {
      noOtherLessonResources: 'No other resources in this lesson',
      noOtherTopicResources: 'No other resources in this topic',
    },
  };

</script>


<style scoped>

  .no-content {
    text-align: center;
    margin-top: 100px;
  }

</style>
