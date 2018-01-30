<template>

  <core-modal
    :title="$tr('deleteLesson')"
    @cancel="closeModal()"
  >
    <p>{{ $tr('lessonDeletionConfirmation', { title: lessonTitle }) }}</p>
    <div class="core-modal-buttons">
      <k-button
        :text="$tr('cancel')"
        appearance="flat-button"
        @click="closeModal()"
      />
      <k-button
        :text="$tr('delete')"
        :primary="true"
        @click="handleDeleteLesson()"
      />
    </div>
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { LessonResource } from 'kolibri.resources';
  import { updateLessons } from '../../../state/actions/lessons';
  import { LessonsPageNames } from '../../../lessonsConstants';

  export default {
    components: {
      coreModal,
      kButton,
    },
    methods: {
      closeModal() {
        return this.$emit('cancel')
      },
      goToLessonsRootPage() {
        this.$router.replace({
          name: LessonsPageNames.ROOT,
          params: {
            classId: this.classId,
            lessonId: this.lessonId,
          },
        })
      },
      handleDeleteLesson() {
        return LessonResource.getModel(this.lessonId).delete()
          ._promise
          .then(() => this.updateLessons())
          .then(() => this.goToLessonsRootPage())
          .catch((error) => {
            // TODO handle error inside the current apge
            console.log(error);
          });
      }
    },
    vuex: {
      getters: {
        classId: state => state.classId,
        lessonId: state => state.pageState.currentLesson.id,
        lessonTitle: state => state.pageState.currentLesson.name,
      },
      actions: {
        updateLessons,
      },
    },
    $trs: {
      cancel: 'Cancel',
      delete: 'Delete',
      deleteLesson: 'Delete lesson',
      lessonDeletionConfirmation: 'Are you sure you want to delete \'{title}\'?',
    }
  };

</script>


<style lang="stylus" scoped></style>
