<template>

  <div>
    <div class="lesson-summary-header">
      <h1 class="lesson-summary-header-title"> {{ lessonTitle }} </h1>
      <div class="lesson-summary-header-options">
        <dropdown-menu
          :name="$tr('options')"
          :options="lessonOptions"
          @select="handleSelectOption"
        />
      </div>
    </div>
    <div>
      <dl>
        <dt>
          <!-- TODO wrapp strings -->
          Status
        </dt>
        <dd>
          {{ lessonActive ? $tr('active') : $tr('inactive') }}
        </dd>
        <dt>
          <!-- TODO wrapp strings -->
          Visibility
        </dt>
        <dd>
          <ul class="group-list">
            <li class="group-list-item" v-for="group in lessonGroups" :key="group.id">
              <!-- TODO gonna have to call contentnode api for title -->
              {{ group.id }}
            </li>
          </ul>
        </dd>
        <dt>
          <!-- TODO wrapp strings -->
          Description:
        </dt>
        <dd>
          {{ lessonDescription }}
        </dd>
      </dl>

      <!-- Maybe use the dt above?? -->
      <h2>{{ $tr('resources') }}</h2>
      <table></table>

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

      <copy-lesson-modal
        v-if="currentAction==='copyLesson'"
        @cancel="currentAction=null"
      />
    </div>

  </div>

</template>


<script>

  import dropdownMenu from 'kolibri.coreVue.components.dropdownMenu';
  // TODO consolidate all modals into a single ManageLessonsModal
  import DeleteLessonModal from '../ManageLessonModals/DeleteLessonModal';
  import ChangeLessonStatusModal from '../ManageLessonModals/ChangeLessonStatusModal';
  import EditLessonDetailsModal from '../ManageLessonModals/EditLessonDetailsModal';
  import CopyLessonModal from '../ManageLessonModals/CopyLessonModal';

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
      CopyLessonModal,
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


<style lang="stylus" scoped>

.lesson-summary-header
  // maintaining a simple right/left alignment in a single text-line without floats. Simple RTL
  display: table
  width: 100%
  &-title
    display: table-cell
    text-align: left
  &-options
    display: table-cell
    text-align: right

// TODO use classes
dt
  font-weight: bold
  // TODO replace with verified values
  margin-top: 1em
  margin-bottom: 1em

dd
  margin: 0

.group-list
  margin: 0
  padding: 0
  &-item
    margin: 0
    list-style: none
    &:not(:last-child)::after
      // is this kosher?
      content: ','

</style>
