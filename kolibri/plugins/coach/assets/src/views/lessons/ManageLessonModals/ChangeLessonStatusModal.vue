<template>

  <core-modal
    :title="$tr('changeLessonStatusTitle')"
    @cancel="closeModal()"
  >

    <form @submit="updateLessonStatus">
      <k-radio-button
        :label="$tr('activeOption')"
        radiovalue="active"
        v-model="lessonStatus"
      />
      <k-radio-button
        :label="$tr('inactiveOption')"
        radiovalue="inactive"
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
        lessonStatus: '',
      };
    },
    created() {
      this.lessonStatus = this.lessonIsActive.is_active ? 'active' : 'inactive';
    },
    methods: {
      closeModal() {
        this.$emit('cancel');
      },
      updateLessonStatus() {
        return LessonResource.getModel(this.lessonId).save({
          is_active: this.lessonStatus === 'active',
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
