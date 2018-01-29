<template>

  <div>
    LessonRootPage
    <k-button
      :primary="true"
      text="New Lesson"
      @click="showModal=true"
    />
    <table class="lessons-list">
      <tr>
        <th>Title</th>
      </tr>
      <tr v-for="lesson in lessons" :key="lesson.id">
        <td>{{ lesson.name }}</td>
      </tr>
    </table>
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
    },
    vuex: {
      getters: {
        lessons: state => state.pageState.lessons,
      },
    }
  };

</script>


<style lang="stylus" scoped></style>
