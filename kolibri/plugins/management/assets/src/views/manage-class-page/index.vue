<template>

  <div>

    <div class="header">
      <h1>{{ $tr('allClasses') }}</h1>

      <icon-button
        class="create-btn"
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
    <class-create-modal v-if="showCreateClassModal" :classes="classes"/>

    <div class="table-wrapper" v-if="!noClassesExist">
      <table class="roster">
        <caption class="visuallyhidden">{{$tr('classes')}}</caption>
        <thead class="table-header">
          <tr>
            <th scope="col" class="table-text">{{ $tr('className') }}</th>
            <th scope="col" class="table-data">{{ $tr('members') }}</th>
            <th scope="col">{{ $tr('actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="classModel in classes">
            <th scope="row" class="table-text">
              <router-link :to="classEditLink(classModel.id)" class="table-name">
                {{classModel.name}}
              </router-link>
            </th>
            <td class="table-data">
              {{ classModel.learner_count + classModel.coach_count + classModel.admin_count }}
            </td>
            <td class="table-btn">
              <button class="delete-class-button" @click="openDeleteClassModal(classModel)">
                {{ $tr('deleteClass') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

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
        this.displayModal(constants.Modals.DELETE_CLASS);
      },
      openCreateClassModal() {
        this.displayModal(constants.Modals.CREATE_CLASS);
      },
    },
    vuex: {
      getters: {
        modalShown: state => state.pageState.modalShown,
        classes: state => state.pageState.classes,
      },
      actions: {
        displayModal: actions.displayModal,
      },
    },
    $trNameSpace: 'classPage',
    $trs: {
      allClasses: 'All Classes',
      // button text
      addNew: 'Add New Class',
      deleteClass: 'Delete Class',
      // table info
      className: 'Class Name',
      classes: 'Users',
      members: 'Members',
      actions: 'Actions',
      noClassesExist: 'No Classes Exist.',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .roster
    width: 100%
    border-spacing: 8px
    border-collapse: separate

  .table-wrapper
    overflow-x: auto

  thead th
    color: $core-text-annotation
    font-size: smaller
    font-weight: normal

  .table-text
    text-align: left
    width: 100%

  .table-data
    text-align: center

  .table-btn
    text-align: right

  .header
    position: relative
    padding-right: 150px
    margin-bottom: 16px

  .create-btn
    position: absolute
    top: 0
    right: 0

  .delete-class-button
    color: red
    border: none

</style>
