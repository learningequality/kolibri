<template>

  <div class="group-section">
    <h2>{{ group.name }}</h2>
    <span>{{ $tr('numLearners', {count: group.users.length }) }}</span>
    <span v-if="group.users.length">{{ `${selectedUsers.length} ${$tr('selected')}` }}</span>
    <icon-button :text="$tr('moveLearners')"
      :primary="true"
      size="small"
      @click="emitMove"
      :disabled="selectedUsers.length === 0" />
    <ui-button v-if="!isUngrouped"
      color="primary"
      :has-dropdown="true"
      ref="dropdownButton"
      size="small">
      <ui-menu slot="dropdown"
        :options="menuOptions"
        @select="handleSelection"
        @close="close" />
    </ui-button>

    <table v-if="group.users.length">
      <thead>
        <tr>
          <th class="col-checkbox">
            <input type="checkbox"
              :checked="allUsersAreSelected"
              @change="toggleSelectAll">
          </th>
          <th class="col-name">{{ $tr('name') }}</th>
          <th class="col-username">{{ $tr('username') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in group.users"
          :class="isSelected(user.id) ? 'selectedrow' : ''"
          @click="toggleSelection(user.id)">
          <td class="col-checkbox">
            <input type="checkbox"
              :id="user.id"
              :value="user.id"
              v-model="selectedUsers">
          </td>
          <td class="col-name"><strong>{{ user.full_name }}</strong></td>
          <td class="col-username">{{ user.username }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>{{ $tr('noLearners') }}</p>
  </div>

</template>


<script>

  const groupActions = require('../../group-actions');

  module.exports = {
    $trNameSpace: 'coachGroupsTable',
    $trs: {
      numLearners: '{count, number, integer} {count, plural, one {Learner} other {Learners}}',
      moveLearners: 'Move Learners',
      renameGroup: 'Rename Group',
      deleteGroup: 'Delete Group',
      name: 'Name',
      username: 'Username',
      selected: 'Selected',
      noLearners: 'No Learners in this group',
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
        validator(group) {
          return group.name && group.users;
        }
      },
      isUngrouped: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        selectedUsers: [],
      };
    },
    computed: {
      menuOptions() {
        return [this.$tr('renameGroup'), this.$tr('deleteGroup')];
      },
      allUsersAreSelected() {
        return (this.group.users.length === this.selectedUsers.length)
          && (this.selectedUsers.length !== 0);
      },
    },
    methods: {
      handleSelection(selectedOption) {
        if (selectedOption === this.$tr('renameGroup')) {
          this.$emit('rename', this.group.name, this.group.id);
        } else if (selectedOption === this.$tr('deleteGroup')) {
          this.$emit('delete', this.group.name, this.group.id);
        }
      },
      close() {
        this.$refs.dropdownButton.closeDropdown();
      },
      isSelected(userId) {
        return this.selectedUsers.includes(userId);
      },
      toggleSelection(userId) {
        const index = this.selectedUsers.indexOf(userId);
        if (index === -1) {
          this.selectedUsers.push(userId);
        } else {
          this.selectedUsers.splice(index, 1);
        }
      },
      toggleSelectAll() {
        if (this.allUsersAreSelected) {
          this.selectedUsers = [];
        } else {
          this.selectedUsers = this.group.users.map(user => user.id);
        }
      },
      emitMove() {
        this.$emit('move', this.group.name, this.group.id, this.selectedUsers, this.isUngrouped);
      },
    },
    vuex: {
      getters: {
        modalShown: state => state.pageState.modalShown,
      },
      actions: {
        displayModal: groupActions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .group-section
    padding-bottom: 2em

  h2
    display: inline-block

  table
    width: 100%
    word-break: break-all

  th
    text-align: left

  td, th
    padding: 0.5em

  tbody
    tr
      cursor: pointer
      &:hover
        background-color: #f1f1f1

  thead
    .col-name, .col-username
      color: #686868
      font-size: small

  .selectedrow
    background-color: $core-bg-canvas

  .col-checkbox
    width: 4%

  .col-name, .col-username
    width: 48%

</style>
