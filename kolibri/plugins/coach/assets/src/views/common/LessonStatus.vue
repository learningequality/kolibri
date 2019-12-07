<template>

  <KPageContainer>
    <KGrid gutter="16">
      <KGridItem class="status-label" :layout12="{ span: 8 }">
        {{ $tr('visibleToLearnersLabel') }}
      </KGridItem>
      <KGridItem class="status-label" :layout12="{ span: 4 }">
        <KSwitch
          name="toggle-lesson-visibility"
          :checked="lesson[activeKey]"
          :value="lesson[activeKey]"
          @change="handleToggleVisibility"
        />
      </KGridItem>
      <KGridItem style="font-weight: bold;">
        {{ coachString('recipientsLabel') }}
      </KGridItem>
      <KGridItem>
        <div>
          <Recipients
            :groupNames="groupNames"
            :hasAssignments="assignments.length > 0"
          />
        </div>
      </KGridItem>
      <KGridItem class="status-label">
        {{ coachString('descriptionLabel') }}
      </KGridItem>
      <KGridItem>
        {{ lesson.description || "--" }}
      </KGridItem>
    </KGrid>
  </KPageContainer>

</template>


<script>

  import { LessonResource } from 'kolibri.resources';
  import Recipients from './Recipients';
  import { coachStringsMixin } from './commonCoachStrings';

  export default {
    name: 'LessonStatus',
    components: { Recipients },
    mixins: [coachStringsMixin],
    props: {
      lesson: {
        type: Object,
        required: true,
      },
      groupNames: {
        type: Array,
        required: true,
      },
      activeKey: {
        type: String,
        required: true,
        validator(value) {
          // Must be active or is_active
          // Also determines the key for assignments, but no need for prop
          return ['active', 'is_active'].includes(value);
        },
      },
    },
    computed: {
      assignments() {
        return this.activeKey === 'is_active'
          ? this.lesson.lesson_assignments
          : this.lesson.assignments;
      },
    },
    methods: {
      handleToggleVisibility() {
        const newActiveState = !this.lesson[this.activeKey];
        const snackbarMessage = newActiveState
          ? this.coachString('lessonVisibleToLearnersLabel')
          : this.coachString('lessonNotVisibleToLearnersLabel');

        let promise = LessonResource.saveModel({
          id: this.lesson.id,
          data: {
            is_active: newActiveState,
          },
          exists: true,
        });

        return promise.then(() => {
          this.$store.dispatch('lessonSummary/updateCurrentLesson', this.lesson.id);
          this.$store.dispatch('classSummary/refreshClassSummary');
          this.$store.dispatch('createSnackbar', snackbarMessage);
        });
      },
    },
    $trs: {
      visibleToLearnersLabel: {
        message: 'Visible to learners',
        context:
          'Label for the switch that toggles whether a lesson is visible to leareners or not.',
      },
    },
  };

</script>


<style scoped lang="scss">

  .grid-item {
    font-size: 0.925rem;
  }
  .status-label {
    padding: 1.5rem 0 0.5rem;
    font-weight: bold;
  }

</style>
