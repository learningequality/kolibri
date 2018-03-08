<template>

  <core-modal
    :title="$tr('changeLessonStatusTitle')"
    @cancel="closeModal()"
  >
    <form @submit.prevent="updateLessonStatus">
      <p>{{ $tr('description') }}</p>
      <k-radio-button
        :label="$tr('activeOption')"
        :radiovalue="true"
        v-model="activeIsSelected"
      />
      <k-radio-button
        :label="$tr('inactiveOption')"
        :radiovalue="false"
        v-model="activeIsSelected"
      />

      <div class="core-modal-buttons">
        <k-button
          :text="$tr('cancel')"
          appearance="flat-button"
          @click="closeModal()"
        />
        <k-button
          type="submit"
          :text="$tr('save')"
          :primary="true"
        />
      </div>
    </form>
  </core-modal>

</template>


<script>

  import { error as logError } from 'kolibri.lib.logging';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { LessonResource } from 'kolibri.resources';
  import { createSnackbar, handleApiError } from 'kolibri.coreVue.vuex.actions';

  export default {
    name: 'changeLessonStatusModal',
    components: {
      coreModal,
      kButton,
      kRadioButton,
    },
    data() {
      return {
        activeIsSelected: null,
      };
    },
    computed: {
      statusHasChanged() {
        return this.activeIsSelected !== this.currentLessonIsActive;
      },
    },
    created() {
      this.activeIsSelected = this.currentLessonIsActive;
    },
    methods: {
      closeModal() {
        return this.$emit('cancel');
      },
      updateLessonStatus() {
        // If status has not changed, do nothing
        if (!this.statusHasChanged) {
          return this.closeModal();
        }
        return LessonResource.getModel(this.lessonId)
          .save({
            is_active: this.activeIsSelected,
          })
          ._promise.then(lesson => {
            this.updateCurrentLesson(lesson);
            this.closeModal();
            this.createSnackbar({
              text: this.activeIsSelected
                ? this.$tr('lessonIsNowActive')
                : this.$tr('lessonIsNowInactive'),
              autoDismiss: true,
            });
          })
          .catch(err => {
            // TODO handle error properly
            this.handleApiError(err);
            logError(err);
          });
      },
    },
    vuex: {
      getters: {
        lessonId: state => state.pageState.currentLesson.id,
        currentLessonIsActive: state => state.pageState.currentLesson.is_active,
      },
      actions: {
        updateCurrentLesson(store, lesson) {
          store.dispatch('SET_CURRENT_LESSON', lesson);
        },
        handleApiError,
        createSnackbar,
      },
    },
    $trs: {
      changeLessonStatusTitle: 'Change lesson status',
      save: 'Save',
      cancel: 'Cancel',
      description: 'Learners can only see active lessons',
      activeOption: 'Active',
      inactiveOption: 'Inactive',
      lessonIsNowActive: 'Lesson is now active',
      lessonIsNowInactive: 'Lesson is now inactive',
    },
  };

</script>


<style lang="stylus" scoped></style>
