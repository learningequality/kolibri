<template>

  <div>
    <h2>{{ group.name }}</h2>
    <!--TODO: Fix this-->
    <span v-if="group.users">{{ $tr('numLearners', {count: group.users.length }) }}</span>
    <span v-else>{{ $tr('numLearners', {count: 0 }) }}</span>
    <!--0 selected-->
    <icon-button :text="$tr('moveLearners')"
      :primary="true"
      size="small"
      @click="moveUsers" />
    <ui-button v-if="showMenu"
      color="primary"
      :has-dropdown="true"
      ref="dropdownButton"
      size="small">
      <ui-menu slot="dropdown"
        :options="menuOptions"
        @select="handleSelection"
        @close="close" />
    </ui-button>
  </div>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    $trNameSpace: 'coachGroupsTable',
    $trs: {
      numLearners: '{count, number, integer} {count, plural, one {Learner} other {Learners}}',
      moveLearners: 'Move Learners',
      renameGroup: 'Rename Group',
      deleteGroup: 'Delete Group',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'ui-button': require('keen-ui/src/UiButton'),
      'ui-menu': require('keen-ui/src/UiMenu'),
    },
    props: {
      group: {
        type: Object,
        required: true,
      },
      className: {
        type: String,
        required: true,
      },
      classId: {
        type: String,
        required: true,
      },
      showMenu: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
      menuOptions() {
        return [{ label: this.$tr('renameGroup') }, { label: this.$tr('deleteGroup') }];
      },

    },
    methods: {
      handleSelection(selectedOption) {
        switch (selectedOption.label) {
          case (this.$tr('renameGroup')):
            this.$emit('rename', this.group.name, this.group.id);
            break;
          case (this.$tr('deleteGroup')):
            this.$emit('delete', this.group.name, this.group.id);
            break;
          default:
            break;
        }
      },
      moveUsers() {
        console.log('move users');
      },
      close() {
        this.$refs.dropdownButton.closeDropdown();
      },
    },
    vuex: {
      getters: {
        modalShown: state => state.pageState.modalShown,
      },
      actions: {
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus"
  scoped></style>
