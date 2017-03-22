<template>

  <div>

    <h1 class="header">
      {{ $tr('allClasses', { name: facilityName }) }}
    </h1>

    <div class="create-btn">
      <icon-button
        @click="openCreateClassModal"
        :text="$tr('addNew')"
        :primary="true"
      />
    </div>

    <class-delete-modal
      v-if="showDeleteClassModal"
      :classid="currentClassDelete.id"
      :classname="currentClassDelete.name"
    />
    <class-create-modal v-if="showCreateClassModal"/>

    <table class="roster" v-if="!noClassesExist">
      <caption class="visuallyhidden">{{$tr('classes')}}</caption>
      <thead>
        <tr>
          <th scope="col" class="table-text">{{ $tr('className') }}</th>
          <th scope="col" class="table-data">{{ $tr('learners') }}</th>
          <th scope="col" class="table-data">{{ $tr('coaches') }}</th>
          <th scope="col" class="table-data">{{ $tr('admins') }}</th>
          <th scope="col"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="classModel in classes">
          <th scope="row" class="table-text">
            <router-link :to="classEditLink(classModel.id)" class="table-name">
              {{classModel.name}}
            </router-link>
          </th>
          <td class="table-data">{{ classModel.learner_count }}</td>
          <td class="table-data">{{ classModel.coach_count }}</td>
          <td class="table-data">{{ classModel.admin_count }}</td>
          <td>
            <button class="delete-class-button" @click="openDeleteClassModal(classModel)">
              {{ $tr('deleteClass') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else>{{ $tr('noClassesExist') }}</p>

  </div>

</template>


<script>

  const constants = require('../../constants');
  const actions = require('../../state/actions');

  module.exports = {
    components: {
      'class-create-modal': require('./class-create-modal'),
      'class-delete-modal': require('./class-delete-modal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
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

  .roster
    width: 100%
    word-break: break-all

    thead
      color: $core-text-annotation
      font-size: smaller

    th
      vertical-align: middle
      padding-bottom: 8px

    .table-text
      text-align: left

    .table-data
      text-align: center

  .create-btn
    float: right

  .header
    display: inline-block

  .delete-class-button
    color: red
    border: none

</style>
