<template>

  <div class="class-roster">

    <div class="header">
      <h1>
        {{ $tr('allClasses', { name: facilityName }) }}
      </h1>
    </div>

    <div class="create">
      <icon-button
        @click="openCreateClassModal"
        class="create-class-button"
        :text="$tr('addNew')"
        :primary="true"/>
    </div>

    <hr>

    <!-- Modals -->
    <class-delete-modal
      v-if="showDeleteClassModal"
      :classid="currentClassDelete.id"
      :classname="currentClassDelete.name"
    />
    <class-create-modal
      v-if="showCreateClassModal"
    />

    <table class="roster" v-if="!noClassesExist">

      <caption class="visuallyhidden">{{$tr('classes')}}</caption>

      <!-- Table Headers -->
      <thead>
        <tr>
          <th class="col-header" :class="{'col-header-mobile': elSize.width > 800}" scope="col"> {{$tr('className')}} </th>
          <div class="status-group">
            <th v-if="elSize.width > 600" class="col-header status-header" scope="col"> {{$tr('learners')}} </th>
            <th v-if="elSize.width > 600" class="col-header status-header" scope="col"> {{$tr('coaches')}} </th>
            <th v-if="elSize.width > 600" class="col-header status-header" scope="col"> {{$tr('admins')}} </th>
          </div>
        </tr>
      </thead>

      <!-- Table body -->
      <tbody>
        <tr v-for="classModel in classes">
          <!-- Class Name field -->
          <th scope="row" class="table-cell">
            <router-link :to="classEditLink(classModel.id)" class="table-name" :class="{'table-name-mobile': elSize.width < 600}">
              {{classModel.name}}
            </router-link>
          </th>

          <div v-if="elSize.width > 600" class="status-group">
            <!-- Learners field -->
            <td class="table-cell status-body">
              {{classModel.learner_count}}
            </td>

            <!-- Coaches field -->
            <td class="table-cell status-body">
              {{classModel.coach_count}}
            </td>

            <!-- Admins field -->
            <td class="table-cell status-body">
              {{classModel.admin_count}}
            </td>
          </div>

          <!-- delete field -->
          <td class="table-cell">
            <div class="delete-class-button" @click="openDeleteClassModal(classModel)">
              {{$tr('deleteClass')}}
            </div>
          </td>

        </tr>
      </tbody>

    </table>

    <p v-else>{{ $tr('noClassesExist') }}</p>

  </div>

</template>


<script>

  const constants = require('../../state/constants');
  const actions = require('../../actions');
  const responsiveElement = require('kolibri.coreVue.mixins.responsiveElement');

  module.exports = {
    components: {
      'class-create-modal': require('./class-create-modal'),
      'class-delete-modal': require('./class-delete-modal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    mixins: [responsiveElement],
    // Has to be a funcion due to vue's treatment of data
    data: () => ({
      currentClassDelete: null,
    }),
    computed: {
      showDeleteClassModal() {
        return this.modalShown === constants.Modals.DELETE_CLASS;
      },
      showCreateClassModal() {
        return this.modalShown === constants.Modals.CREATE_CLASS;
      },
      noClassesExist() {
        return this.classes.length === 0;
      },
    },
    methods: {
      classEditLink(id) {
        return {
          name: constants.PageNames.CLASS_EDIT_MGMT_PAGE,
          params: { id },
        };
      },
      openDeleteClassModal(classModel) {
        this.currentClassDelete = classModel;
        this.displayModal(constants.ModalNames.DELETE_CLASS);
      },
      openCreateClassModal() {
        this.displayModal(constants.Modals.CREATE_CLASS);
      },
    },
    vuex: {
      getters: {
        modalShown: state => state.pageState.modalShown,
        classes: state => state.pageState.classes,
        facilityName: state => state.pageState.facility.name,
      },
      actions: {
        displayModal: actions.displayModal,
      },
    },
    $trNameSpace: 'classPage',
    $trs: {
      allClasses: 'All Classes in {name}',
      // button text
      addNew: 'Add New Class',
      deleteClass: 'Delete Class',
      // table info
      className: 'Class Name',
      classes: 'Users',
      learners: 'Learners',
      coaches: 'Coaches',
      admins: 'Admins',
      noClassesExist: 'No Classes Exist.',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  // Padding height that separates rows from eachother
  $row-padding = 1.5em

  .status-group
    display: inline-table
    width: 100%
    text-align: center
    margin-left: 30px

  .status-header
    vertical-align: middle

  .status-body
    padding-top: 0.5em
    width: 50px

  .create
    float: right
    margin-top: -48px

  input[type='search']
    display: inline-block
    box-sizing: border-box
    position: relative
    top: 0
    left: 10px
    height: 100%
    width: 85%
    border-color: transparent
    background-color: transparent
    clear: both

  .header h1
    display: inline-block

  hr
    background-color: $core-text-annotation
    height: 1px
    border: none

  tr
    text-align: left

  .roster
    width: 100%
    word-break: break-all

  th
    text-align: inherit

  .col-header
    padding-bottom: (1.2 * $row-padding)
    color: $core-text-annotation
    font-weight: normal
    font-size: 80%
    width: 28%

  .col-header-mobile
    width: 50%

  .table-cell
    font-weight: normal // compensates for <th> cells
    padding-bottom: $row-padding
    color: $core-text-default

  .delete-class-button
    color: red
    width: 110px
    padding: 8px
    cursor: pointer
    margin-right: 4px
    float: right

  .create-class-button
    width: 100%

  .table-name
    $line-height = 1em
    line-height: $line-height
    max-height: ($line-height * 2)
    display: inline-block
    padding-right: 1em
    font-weight: bold

  .table-name-mobile
    overflow: hidden
    text-overflow: ellipsis
    white-space: nowrap
    width: 100px

  .role-header
    display: none

  @media print
    .class-roster
      width: 500px

</style>
