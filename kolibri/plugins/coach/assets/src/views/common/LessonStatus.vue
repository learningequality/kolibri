<template>

  <KPageContainer :topMargin="$isPrint ? 0 : 24">
    <KGrid gutter="16">
      <!-- Visibility status/switch -->
      <div
        v-show="!$isPrint"
        class="status-item visibility-item"
        :style="{
          display: 'flex',
          alignItems: 'center',
        }"
      >
        <KGridItem
          class="status-label"
          :style="{ marginBottom: 0 }"
          :layout4="{ span: 3 }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 10 }"
        >
          {{ coachString('lessonVisibleLabel') }}
        </KGridItem>
        <KGridItem
          :layout4="{ span: 1 }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 2 }"
        >
          <KSwitch
            name="toggle-lesson-visibility"
            label=""
            :checked="lesson.active"
            :value="lesson.active"
            @change="toggleModal(lesson)"
          />
        </KGridItem>
      </div>

      <!-- Recipients -->
      <div class="status-item">
        <KGridItem
          class="status-label"
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="layout12Label"
        >
          {{ coachString('recipientsLabel') }}
        </KGridItem>
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="layout12Value"
        >
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
        <KGridItem
          class="status-label"
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="layout12Label"
        >
          {{ coachString('descriptionLabel') }}
        </KGridItem>
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="layout12Value"
        >
          <KOptionalText>
            <template v-if="lesson.description">
              {{ lesson.description }}
            </template>
          </KOptionalText>
        </KGridItem>
      </div>

      <!-- Class name  -->
      <div class="status-item">
        <KGridItem
          class="status-label"
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="layout12Label"
        >
          {{ coachString('classLabel') }}
        </KGridItem>
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="layout12Value"
        >
          <div>
            {{ className }}
          </div>
        </KGridItem>
      </div>

      <!-- Lesson Sizes -->
      <div class="status-item">
        <KGridItem
          class="status-label"
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="layout12Label"
        >
          {{ coachString('sizeLabel') }}
        </KGridItem>
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="layout12Value"
        >
          <p v-if="lesson.size">
            {{ bytesForHumans(lesson.size) }}
          </p>
          <KEmptyPlaceholder v-else />
        </KGridItem>
      </div>

      <!-- Date created -->
      <div class="status-item">
        <KGridItem
          class="status-label"
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="layout12Label"
        >
          {{ coreString('dateCreated') }}
        </KGridItem>
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 4 }"
          :layout12="layout12Value"
        >
          <ElapsedTime
            :date="lessonDateCreated"
            style="margin-top: 8px"
          />
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

  import LessonResource from 'kolibri-common/apiResources/LessonResource';
  import { mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import bytesForHumans from 'kolibri/uiText/bytesForHumans';
  import ElapsedTime from 'kolibri-common/components/ElapsedTime';
  import { LESSON_VISIBILITY_MODAL_DISMISSED } from 'kolibri/constants';
  import Lockr from 'lockr';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import Recipients from './Recipients';
  import { coachStringsMixin } from './commonCoachStrings';

  export default {
    name: 'LessonStatus',
    components: { Recipients, ElapsedTime },
    mixins: [coachStringsMixin, commonCoreStrings],
    setup() {
      const { createSnackbar } = useSnackbar();
      return { createSnackbar };
    },
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
        return this.lesson.assignments;
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
      lessonDateCreated() {
        if (this.lesson.date_created) {
          return new Date(this.lesson.date_created);
        } else {
          return null;
        }
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
        const newActiveState = !this.lesson.active;
        const snackbarMessage = newActiveState
          ? this.coachString('lessonVisibleToLearnersLabel')
          : this.coachString('lessonNotVisibleToLearnersLabel');

        const promise = LessonResource.saveModel({
          id: this.lesson.id,
          data: {
            active: newActiveState,
          },
          exists: true,
        });

        this.manageModalVisibilityAndPreferences();

        return promise.then(() => {
          this.$store.dispatch('lessonSummary/updateCurrentLesson', this.lesson.id);
          this.$store.dispatch('classSummary/refreshClassSummary');
          this.createSnackbar(snackbarMessage);
        });
      },
      toggleModal(lesson) {
        // has the user set their preferences to not have a modal confirmation?
        const hideModalConfirmation = Lockr.get(LESSON_VISIBILITY_MODAL_DISMISSED);
        this.activeLesson = lesson;
        if (!hideModalConfirmation && this.learnOnlyDevicesExist) {
          if (lesson.active) {
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


<style lang="scss" scoped>

  .status-item {
    width: 100%;
    font-size: 0.925rem;

    &:first-child {
      margin-top: 16px;
    }

    &:not(:last-child) {
      margin-bottom: 24px;
    }

    p {
      margin: 0;
    }

    @media print {
      padding: 2px 0;
      margin-top: 0 !important;
      margin-bottom: 0 !important;
      font-size: inherit;
    }
  }

  .status-label {
    margin-bottom: 8px;
    font-weight: bold;
  }

</style>
