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
    <div
      v-if="nextTopic"
      class="footer"
      :style="{
        backgroundColor: $themePalette.grey.v_200
      }"
    >
      <!-- TODO replace placeholders with new LearningActivityIcon component -->
      <KIcon
        icon="topic"
        class="icon"
      />
      <span class="text">
        <p class="header">{{ $tr('nextTopic') }}</p>
        <p class="title">{{ nextTopic.title }}</p>
      </span>
      <KIcon
        icon="forward"
        class="continue icon"
      />
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
      nextTopic: {
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
      nextTopic: 'Next Topic:',
    },
  };

</script>


<style scoped>

  .no-content {
    text-align: center;
    margin-top: 100px;
  }

  .footer {
    height: 100px;
    padding-top: 32px;
    position: static;
    bottom: 0;
    padding-left: 32px;
  }

  .icon {
    vertical-align: top;
    width: 33px;
    height: 33px;
  }

  .text {
    display: inline-block;
    padding-left: 17px;
    width: 225px;
  }

  .header {
    margin: 0;
  }

  .title {
    margin: 0;
    font-weight: bold;
  }

  .continue {
    margin-left: 60px;
  }


</style>
