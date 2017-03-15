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

    <table>
      <thead>
        <tr>
          <th>
            <input type="checkbox"
              :checked="allUsersAreSelected"
              @change="toggleSelectAll">
          </th>
          <th>{{ $tr('name') }}</th>
          <th>{{ $tr('username') }}</th>
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
      name: 'Name',
      username: 'Username',
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
        return [{ label: this.$tr('renameGroup') }, { label: this.$tr('deleteGroup') }];
      },
      allUsersAreSelected() {
        return (this.group.users.length === this.selectedUsers.length)
          && (this.selectedUsers.length !== 0);
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
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus"
  scoped></style>
