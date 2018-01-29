<template>

  <div>
    LessonRootPage
    <k-button
      :primary="true"
      text="New Lesson"
      @click="showModal=true"
    />
    <lesson-root-page-create-lesson-modal
      v-if="showModal"
      @cancel="showModal=false"
    />
  </div>

</template>


<script>

  import LessonRootPageCreateLessonModal from './LessonRootPageCreateLessonModal';
  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'LessonRootPage',
    components: {
      kButton,
      LessonRootPageCreateLessonModal,
    },
    data() {
      return {
        showModal: false,
      };
    }
  };

</script>


<style lang="stylus" scoped></style>
