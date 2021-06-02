<template>

  <CardLink :to="to">
    <div class="card-contents">
      <div class="classroom-name">
        {{ classroomName }}
      </div>

      <div class="assignment-name">
        {{ assignmentName }}
      </div>

      <div class="progress" :class="themeClasses.progress">
        <KLabeledIcon
          v-if="inProgressLabel"
          icon="inProgress"
          :label="inProgressLabel"
        />
        <KLabeledIcon
          v-else-if="completedLabel"
          icon="mastered"
          :label="completedLabel"
        />
      </div>
    </div>
  </CardLink>

</template>


<script>

  import CardLink from './CardLink.vue';

  // Component for shared layout in Quiz and Lesson cards
  export default {
    name: 'AssignmentCard',
    components: {
      CardLink,
    },
    props: {
      classroomName: {
        type: String,
        required: true,
      },
      assignmentName: {
        type: String,
        required: true,
      },
      completedLabel: {
        type: String,
        required: false,
        default: '',
      },
      inProgressLabel: {
        type: String,
        required: false,
        default: '',
      },
      to: {
        type: Object,
        required: true,
      },
    },
    computed: {
      themeClasses() {
        const { annotation } = this.$themeTokens;
        return {
          progress: this.$computedClass({
            color: annotation,
          }),
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  $font-size-normal: 16px;
  $font-size-annotation: 14px;

  .card-contents {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .classroom-name {
    font-size: $font-size-annotation;
  }

  .assignment-name {
    flex-grow: 1;
    font-size: $font-size-normal;
    font-weight: bold;
  }

  .progress {
    margin-top: 16px;
    font-size: $font-size-annotation;
  }

</style>
