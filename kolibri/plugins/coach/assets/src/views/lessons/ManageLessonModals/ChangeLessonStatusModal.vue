<template>

  <core-modal
    :title="$tr('changeLessonStatusTitle')"
    @cancel="closeModal()"
  >
    <form @submit="updateLessonStatus">
      <k-radio-button
        :label="$tr('activeOption')"
        :radiovalue="true"
        v-model="lessonStatus"
      />
      <k-radio-button
        :label="$tr('inactiveOption')"
        :radiovalue="false"
        v-model="lessonStatus"
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

  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import { LessonResource } from 'kolibri.resources';

  export default {
    components: {
      kRadioButton,
    },
    data() {
      return {
        lessonStatus: null,
      };
    },
    computed: {
      statusHasChanged() {
        return this.lessonStatus !== this.lessonIsActive;
      },
    },
    created() {
      this.lessonStatus = this.lessonIsActive;
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
        return LessonResource.getModel(this.lessonId).save({
          is_active: this.lessonStatus,
        })
          ._promise
          .then(lesson => this.updateCurrentLesson(lesson))
          .then(() => this.closeModal())
          .catch(err => {
            // TODO handle error properly
            console.error(err)
          });
      },
    },
    vuex: {
      getters: {
        lessonId: state => state.pageState.currentLesson.id,
        lessonIsActive: state => state.pageState.currentLesson.is_active,
      },
      actions: {
        updateCurrentLesson(store, lesson) {
          store.dispatch('SET_CURRENT_LESSON', lesson);
        },
      },
    },
    $trs: {
      changeLessonStatusTitle: 'Change lesson status',
      save: 'Save',
      cancel: 'Cancel',
      activeOption: 'Active. Learners can see this lesson.',
      inactiveOption: 'Inactive. Lesson is hidden from learners.',
    },
  };

</script>


<style lang="stylus" scoped></style>
