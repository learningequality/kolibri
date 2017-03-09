<template>

  <div>
    <h1>{{ $tr('groups') }} - {{ className }}</h1>
    <icon-button
      :text="$tr('newGroup')"
      :primary="true"
      @click="openCreateGroupModal"
    >
      <mat-svg category="content" name="add"/>
    </icon-button>

    <create-group-modal
      v-if="showCreateGroupModal"
      :className="className"
      :classId="classId"/>
  </div>

</template>


<script>

  const actions = require('../../actions');
  const constants = require('../../state/constants');


  module.exports = {
    $trNameSpace: 'coachGroupsPage',
    $trs: {
      groups: 'Groups',
      newGroup: 'New group'
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'create-group-modal': require('./create-group-modal'),
    },
    computed: {
      showCreateGroupModal() {
        return this.modalShown === constants.Modals.CREATE_GROUP;
      },
    },
    methods: {
      openCreateGroupModal() {
        this.displayModal(constants.Modals.CREATE_GROUP);
      },
    },
    vuex: {
      getters: {
        className: state => state.pageState.class.name,
        classId: state => state.pageState.class.id,
        modalShown: state => state.pageState.modalShown,
      },
      actions: {
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
