<template>

  <div>
    LessonsRootPage
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
    <create-lesson-modal
      v-if="showModal"
      @cancel="showModal=false"
    />
  </div>

</template>


<script>

  import CreateLessonModal from './CreateLessonModal';
  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'LessonsRootPage',
    components: {
      kButton,
      CreateLessonModal,
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
