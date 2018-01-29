<template>

  <div>
    LessonRootPage
    <k-button
      :primary="true"
      text="New Lesson"
    />
    <lesson-root-page-create-lesson-modal />
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
  };

</script>


<style lang="stylus" scoped></style>
