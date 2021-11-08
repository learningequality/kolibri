<template>

  <div class="wrapper">
    <div class="top-bar">
      <h2>{{ title }}</h2>
    </div>

    <div class="content-list">
      <KRouterLink 
        v-for="content in contentNodes" 
        :key="content.id" 
        :to="genContentLink(content.id, content.is_leaf)"
        class="item"
      >
        <LearningActivityIcon class="activity-icon" :kind="content.learning_activities" />
        <div class="content-meta">
          <div>{{ content.title }}</div>
          <TimeDuration :seconds="content.duration" />
        </div>
        <div class="progress">
          <KIcon v-if="content.progress === 1" icon="mastered" />
          <ProgressBar :progress="content.progress" />
        </div>
      </KRouterLink>
    </div>
  </div>

</template>

<script>

  import TimeDuration from 'kolibri.coreVue.components.TimeDuration';
  import genContentLink from '../utils/genContentLink';
  import LearningActivityIcon from './LearningActivityIcon.vue';
  import ProgressBar from './ProgressBar';

  export default {
    name: 'AlsoInThis',
    components: {
      LearningActivityIcon,
      ProgressBar,
      TimeDuration,
    },
    props: {
      /**
       * @param {Array<object>} contentNodes - The contentNode objects to be displayed. Each
       * contentNode must include the following keys id, title, duration, progress, is_leaf.
       */
      contentNodes: {
        type: Array,
        required: true,
      },
      /**
       * Title text for the component.
       */
      title: {
        type: String,
        required: true,
      },
    },
    methods: { genContentLink },
  };

</script>

<style scoped>

.wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.item {
  height: 80px;
  width: 100%;
  display: block;
}

.top-bar {
  position: relative;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  /*line-height: 40px;*/
  background-color: #fff;

}
</style>
