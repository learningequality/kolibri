<template>

  <div>
    <h1>{{ $tr('groups') }} - {{ className }}</h1>
    <icon-button :text="$tr('newGroup')"
      :primary="true"
      @click="openCreateGroupModal">
      <mat-svg category="content"
        name="add" />
    </icon-button>

    <create-group-modal v-if="showCreateGroupModal"
      :className="className"
      :classId="classId" />

    <rename-group-modal v-if="showRenameGroupModal"
      :className="className"
      :classId="classId" />

    <div v-for="group in groups">
      <h2>{{ group.name }}</h2>
      <!--{{ $tr('numLearners', {count: group.users.length}) }} -->
      <!--0 selected-->
      <icon-button :text="$tr('moveLearners')"
      :primary="true"
      @click="moveUsers"/>
      <ui-button color="primary"
        :has-dropdown="true"
        ref="groupDropdownButton"
        size="small">
        <ui-menu slot="dropdown"
          :options="menuOptions"
          @select="renameOrDelete"
          @close="closeGroupDropdowns"/>
      </ui-button>
    </div>
  </div>

</template>


<script>

  const actions = require('../../actions');
  const constants = require('../../state/constants');


  module.exports = {
    $trNameSpace: 'coachGroupsPage',
    $trs: {
      groups: 'Groups',
      newGroup: 'New group',
      numLearners: '{count, number, integer} {count, plural, one {Learner} other {Learners}}',
      moveLearners: 'Move Learners'
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'create-group-modal': require('./create-group-modal'),
      'rename-group-modal': require('./rename-group-modal'),
      'ui-button': require('keen-ui/src/UiButton'),
      'ui-menu': require('keen-ui/src/UiMenu'),
    },
    computed: {
      showCreateGroupModal() {
        return this.modalShown === constants.Modals.CREATE_GROUP;
      },
      showRenameGroupModal() {
        return this.modalShown === constants.Modals.RENAME_GROUP;
      },
      menuOptions() {
        return [{ label: 'Rename Group' }, { label: 'Delete Group' }];
      },
    },
    methods: {
      openCreateGroupModal() {
        this.displayModal(constants.Modals.CREATE_GROUP);
      },
      openRenameGroupModal() {
        this.displayModal(constants.Modals.RENAME_GROUP);
      },
      openDeleteGroupModal() {
        this.displayModal(constants.Modals.DELETE_GROUP);
      },
      renameOrDelete(option) {
        switch (option.label) {
          case 'Rename Group':
            this.openRenameGroupModal();
            break;
          case 'Delete Group':
            this.openDeleteGroupModal();
            break;
          default:
            break;
        }
      },
      moveUsers() {
        console.log('move users');
      },
      closeGroupDropdowns() {
        // lowkey ashamed
        this.$refs.groupDropdownButton.forEach((button) => {
          button.closeDropdown();
        });
      },
    },
    vuex: {
      getters: {
        className: state => state.pageState.class.name,
        classId: state => state.pageState.class.id,
        classUsers: state => state.pageState.classUsers,
        modalShown: state => state.pageState.modalShown,
        groups: state => state.pageState.groups,
      },
      actions: {
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus"
  scoped></style>
