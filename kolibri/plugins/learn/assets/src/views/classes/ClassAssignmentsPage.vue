<template>

  <div>
    <h1 class="classroom-name">
      <KLabeledIcon icon="classroom" :label="classroomName" />
    </h1>

    <AssignedExamsCards
      :exams="exams"
      :isMobile="windowIsSmall"
    />
    <AssignedLessonsCards
      :lessons="lessons"
      :isMobile="windowIsSmall"
    />
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import AssignedExamsCards from './AssignedExamsCards';
  import AssignedLessonsCards from './AssignedLessonsCards';

  export default {
    name: 'ClassAssignmentsPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      AssignedExamsCards,
      AssignedLessonsCards,
    },
    mixins: [responsiveWindowMixin],
    data() {
      return {
        pollTimeoutId: null,
      };
    },
    computed: {
      ...mapState('classAssignments', {
        classroomName: state => state.currentClassroom.name,
        exams: state => state.currentClassroom.assignments.exams,
        lessons: state => state.currentClassroom.assignments.lessons,
      }),
    },
    mounted() {
      this.schedulePoll();
    },
    beforeDestroy() {
      clearTimeout(this.pollTimeoutId);
    },
    methods: {
      schedulePoll() {
        this.pollTimeoutId = setTimeout(this.pollForUpdates, 30000);
      },
      pollForUpdates() {
        this.$store.dispatch('classAssignments/updateWithChanges').then(() => {
          this.schedulePoll();
        });
      },
    },
    $trs: {
      documentTitle: 'Class assignments',
    },
  };

</script>


<style lang="scss" scoped>

  .classroom-name {
    margin-bottom: 32px;
  }

</style>
