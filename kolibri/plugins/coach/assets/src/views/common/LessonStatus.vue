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
          {{ coachString('lessonVisibleLabel') }}
        </KGridItem>
        <KGridItem :layout12="{ span: 4 }">
          <KSwitch
            name="toggle-lesson-visibility"
            label=""
            :checked="lesson.is_active"
            :value="lesson.is_active"
            @change="toggleModal(lesson)"
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
          <KOptionalText>
            <template v-if="lesson.description">
              {{ lesson.description }}
            </template>
          </KOptionalText>
        </KGridItem>
      </div>

      <!-- Lesson Sizes -->
      <div class="status-item">
        <KGridItem class="status-label" :layout12="layout12Label">
          {{ coachString('sizeLabel') }}
        </KGridItem>
        <KGridItem :layout12="layout12Value">
          <p>
            {{ bytesForHumans(lesson.size) }}
          </p>
        </KGridItem>
      </div>
    </KGrid>
    <KModal
      v-if="showLessonIsVisibleModal && !userHasDismissedModal"
      :title="coachString('makeLessonVisibleTitle')"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      @submit="handleToggleVisibility(activeLesson)"
      @cancel="showLessonIsVisibleModal = false"
    >
      <p>{{ coachString('makeLessonVisibleText') }}</p>
      <p>{{ coachString('fileSizeToDownload', { size: bytesForHumans(lesson.size) }) }}</p>
      <KCheckbox
        :checked="dontShowAgainChecked"
        :label="coachString('dontShowAgain')"
        @change="dontShowAgainChecked = $event"
      />
    </KModal>

    <KModal
      v-if="showLessonIsNotVisibleModal && !userHasDismissedModal"
      :title="coachString('makeLessonNotVisibleTitle')"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      @submit="handleToggleVisibility(activeLesson)"
      @cancel="showLessonIsNotVisibleModal = false"
    >
      <p>{{ coachString('makeLessonNotVisibleText') }}</p>
      <p>{{ coachString('fileSizeToRemove', { size: bytesForHumans(lesson.size) }) }}</p>
      <KCheckbox
        :checked="dontShowAgainChecked"
        :label="coachString('dontShowAgain')"
        @change="dontShowAgainChecked = $event"
      />
    </KModal>
  </KPageContainer>

</template>


<script>

  import { LessonResource } from 'kolibri.resources';
  import { mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import { LESSON_VISIBILITY_MODAL_DISMISSED } from 'kolibri.coreVue.vuex.constants';
  import Lockr from 'lockr';
  import Recipients from './Recipients';
  import { coachStringsMixin } from './commonCoachStrings';

  export default {
    name: 'LessonStatus',
    components: { Recipients },
    mixins: [coachStringsMixin, commonCoreStrings],
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
    },
    data() {
      return {
        showLessonIsVisibleModal: false,
        showLessonIsNotVisibleModal: false,
        activeLesson: null,
        dontShowAgainChecked: false,
        learnOnlyDevicesExist: false,
      };
    },
    computed: {
      assignments() {
        return this.lesson.lesson_assignments
          ? this.lesson.lesson_assignments
          : this.lesson.assignments;
      },
      layout12Label() {
        return { span: this.$isPrint ? 3 : 12 };
      },
      layout12Value() {
        return { span: this.$isPrint ? 9 : 12 };
      },
      userHasDismissedModal() {
        return Lockr.get(LESSON_VISIBILITY_MODAL_DISMISSED);
      },
    },
    mounted() {
      this.checkIfAnyLODsInClass();
    },
    methods: {
      ...mapActions(['fetchUserSyncStatus']),
      // modal about lesson sizes should only exist of LODs exist in the class
      // which we are checking via if there have recently been any user syncs
      // TODO: refactor to a more robust check
      checkIfAnyLODsInClass() {
        this.fetchUserSyncStatus({ member_of: this.$route.params.classId }).then(data => {
          if (data && data.length > 0) {
            this.learnOnlyDevicesExist = true;
          }
        });
      },
      handleToggleVisibility() {
        const newActiveState = !this.lesson.is_active;
        const snackbarMessage = newActiveState
          ? this.coachString('lessonVisibleToLearnersLabel')
          : this.coachString('lessonNotVisibleToLearnersLabel');

        const promise = LessonResource.saveModel({
          id: this.lesson.id,
          data: {
            is_active: newActiveState,
          },
          exists: true,
        });

        this.manageModalVisibilityAndPreferences();

        return promise.then(() => {
          this.$store.dispatch('lessonSummary/updateCurrentLesson', this.lesson.id);
          this.$store.dispatch('classSummary/refreshClassSummary');
          this.$store.dispatch('createSnackbar', snackbarMessage);
        });
      },
      toggleModal(lesson) {
        // has the user set their preferences to not have a modal confirmation?
        const hideModalConfirmation = Lockr.get(LESSON_VISIBILITY_MODAL_DISMISSED);
        this.activeLesson = lesson;
        if (!hideModalConfirmation && this.learnOnlyDevicesExist) {
          if (lesson.is_active) {
            this.showLessonIsVisibleModal = false;
            this.showLessonIsNotVisibleModal = true;
          } else {
            this.showLessonIsNotVisibleModal = false;
            this.showLessonIsVisibleModal = true;
          }
        } else {
          // proceed with visibility changes withhout the modal
          this.handleToggleVisibility(lesson);
        }
      },
      manageModalVisibilityAndPreferences() {
        if (this.dontShowAgainChecked) {
          Lockr.set(LESSON_VISIBILITY_MODAL_DISMISSED, true);
        }
        this.activeLesson = null;
        this.showLessonIsVisibleModal = false;
        this.showLessonIsNotVisibleModal = false;
      },
      bytesForHumans,
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
