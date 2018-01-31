<template>

  <div>
    <dropdown-menu
      :name="$tr('options')"
      :options="lessonOptions"
      @select="handleSelectOption"
    />
    <h1> {{ lessonTitle }} </h1>
    <div> Options DD </div>
    <p>
      Status:
    <!-- TODO include icon + string -->
    </p>
    <div v-if="lessonActive">
      {{ $tr('active') }}
    </div>
    <div v-else>
      {{ $tr('inactive') }}
    </div>
    <p> {{ lessonDescription }} </p>
    <p> Visibility to: </p>

    <div>
      <p>{{ $tr('resources') }}</p>
      <table></table>
    </div>

    <delete-lesson-modal
      v-if="currentAction==='deleteLesson'"
      @cancel="currentAction=null"
    />

    <change-lesson-status-modal
      v-if="currentAction==='changeLessonStatus'"
      @cancel="currentAction=null"
    />

    <edit-lesson-details-modal
      v-if="currentAction==='editLessonDetails'"
      @cancel="currentAction=null"
    />
  </div>

</template>


<script>

  import dropdownMenu from 'kolibri.coreVue.components.dropdownMenu';
  // TODO consolidate all modals into a single ManageLessonsModal
  import DeleteLessonModal from '../ManageLessonModals/DeleteLessonModal';
  import ChangeLessonStatusModal from '../ManageLessonModals/ChangeLessonStatusModal';
  import EditLessonDetailsModal from '../ManageLessonModals/EditLessonDetailsModal';

  const lessonActions = [
    'editLessonDetails',
    'copyLesson',
    'deleteLesson',
    // TODO remove from dropdown
    'changeLessonStatus',
  ];

  export default {
    components: {
      ChangeLessonStatusModal,
      DeleteLessonModal,
      EditLessonDetailsModal,
      dropdownMenu,
    },
    data() {
      return {
        currentAction: null,
      }
    },
    computed: {
      lessonOptions() {
        return lessonActions.map(action => ({
          label: this.$tr(action),
          action,
        }));
      }
    },
    methods: {
      handleSelectOption({ action }) {
        this.currentAction = action;
      }
    },
    vuex: {
      getters: {
        lessonTitle: state => state.pageState.currentLesson.name,
        lessonActive: state => state.pageState.currentLesson.is_active,
        lessonDescription: state => state.pageState.currentLesson.description,
        lessonGroups: state => state.pageState.currentLesson.assigned_groups,
        lessonResources: state => state.pageState.currentLesson.resources,
      },
      actions: {

      },
    },
    $trs: {
      // TODO make labels more semantic
      active: 'Active',
      changeLessonStatus: 'Change',
      copyLesson: 'Copy to',
      deleteLesson: 'Delete',
      description: 'Description',
      editLessonDetails: 'Edit details',
      inactive: 'Inactive',
      options: 'Options',
      resources: 'Resources',
      status: 'Status',
      visibleTo: 'Visible to',
    }
  };

</script>


<style lang="stylus" scoped></style>
