<template>

  <KPageContainer :topMargin="$isPrint ? 0 : 24">
    <KGrid gutter="16">
      <!-- Class name, for print only -->
      <div v-if="$isPrint" class="status-item">
        <KGridItem class="status-label" :layout12="layout12Label">
          {{ coachString('classLabel') }}
        </KGridItem>
        <KGridItem :layout12="layout12Value">
          {{ className }}
        </KGridItem>
      </div>

      <!-- Visibility status/switch -->
      <div v-show="!$isPrint" class="status-item visibility-item">
        <KGridItem class="status-label" :layout12="{ span: 8 }">
          {{ $tr('visibleToLearnersLabel') }}
        </KGridItem>
        <KGridItem :layout12="{ span: 4 }">
          <KSwitch
            name="toggle-lesson-visibility"
            :checked="lesson[activeKey]"
            :value="lesson[activeKey]"
            @change="handleToggleVisibility"
          />
        </KGridItem>
      </div>

      <!-- Recipients -->
      <div class="status-item">
        <KGridItem class="status-label" :layout12="layout12Label">
          {{ coachString('recipientsLabel') }}
        </KGridItem>
        <KGridItem :layout12="layout12Value">
          <div>
            <Recipients
              :groupNames="groupNames"
              :hasAssignments="assignments.length > 0"
            />
          </div>
        </KGridItem>
      </div>

      <!-- Description -->
      <div class="status-item">
        <KGridItem class="status-label" :layout12="layout12Label">
          {{ coachString('descriptionLabel') }}
        </KGridItem>
        <KGridItem :layout12="layout12Value">
          <template v-if="lesson.description">
            {{ lesson.description }}
          </template>
          <KEmptyPlaceholder v-else />
        </KGridItem>
      </div>
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
      className: {
        type: String,
        required: true,
      },
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
      layout12Label() {
        return { span: this.$isPrint ? 3 : 12 };
      },
      layout12Value() {
        return { span: this.$isPrint ? 9 : 12 };
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

  .status-item {
    width: 100%;
    padding: 10px 0;
    font-size: 0.925rem;

    @media print {
      padding: 2px 0;
      font-size: inherit;

      &:first-child {
        padding-top: 0;
      }

      &:last-child {
        padding-bottom: 0;
      }
    }
  }

  .visibility-item {
    padding-top: 16px;
    padding-bottom: 6px;

    .grid-item {
      vertical-align: middle;
    }

    .status-label {
      padding-bottom: 3px;
    }
  }

  .status-label {
    font-weight: bold;
  }

</style>
