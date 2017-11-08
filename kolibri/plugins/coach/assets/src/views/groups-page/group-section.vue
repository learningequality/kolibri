<template>

  <div class="group-section">
    <div class="pure-g">
      <div class="no-side-padding" :class="elSize.width < 700 ? 'pure-u-1-1' : 'pure-u-1-2'">
        <h2 class="group-name right-margin">{{ group.name }}</h2>
        <span class="small-text">{{ $tr('numLearners', {count: group.users.length }) }}</span>
      </div>

      <div
        class="no-side-padding"
        :class="elSize.width < 700 ? 'pure-u-1-1' : 'pure-u-1-2 right-align vertically-align'"
      >
        <span v-if="group.users.length" class="right-margin small-text">
          {{ `${selectedUsers.length} ${$tr('selected')}` }}
        </span>
        <k-button
          class="right-margin"
          :text="$tr('moveLearners')"
          :primary="false"
          :disabled="!canMove || selectedUsers.length === 0"
          @click="emitMove"
        />
        <ui-button
          v-if="!isUngrouped"
          color="primary"
          ref="dropdownButton"
          size="small"
          :hasDropdown="true"
        >
          <ui-menu
            slot="dropdown"
            :options="menuOptions"
            @select="handleSelection"
            @close="close"
          />
        </ui-button>
      </div>
    </div>

    <table v-if="group.users.length">
      <thead>
        <tr>
          <th class="col-checkbox">
            <k-checkbox
              :label="$tr('selectAll')"
              :showLabel="false"
              :checked="allUsersAreSelected"
              :indeterminate="someUsersAreSelected"
              @change="toggleSelectAll"
            />
          </th>
          <th class="col-name">{{ $tr('name') }}</th>
          <th class="col-username">{{ $tr('username') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="user in group.users"
          :key="user.id"
          :class="isSelected(user.id) ? 'selectedrow' : ''"
          @click="toggleSelection(user.id)"
        >
          <td class="col-checkbox">
            <k-checkbox
              :label="$tr('selectLearner')"
              :showLabel="false"
              :checked="isSelected(user.id)"
              @change="toggleSelection(user.id)"
              @click.native.stop
            />
          </td>
          <td class="col-name"><strong>{{ user.full_name }}</strong></td>
          <td class="col-username">{{ user.username }}</td>
        </tr>
      </tbody>
    </table>
    <span v-else>{{ $tr('noLearners') }}</span>
  </div>

</template>


<script>

  import * as groupActions from '../../state/actions/group';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import uiButton from 'keen-ui/src/UiButton';
  import uiMenu from 'keen-ui/src/UiMenu';
  import ResponsiveElement from 'kolibri.coreVue.mixins.responsiveElement';

  export default {
    name: 'coachGroupsTable',
    $trs: {
      numLearners: '{count, number, integer} {count, plural, one {Learner} other {Learners}}',
      moveLearners: 'Move Learners',
      actions: 'Actions',
      renameGroup: 'Rename Group',
      deleteGroup: 'Delete Group',
      name: 'Name',
      username: 'Username',
      selected: 'Selected',
      noLearners: 'No Learners in this group',
      selectAll: 'Select all',
      selectLearner: 'Select learner',
    },
    components: {
      kButton,
      kCheckbox,
      uiButton,
      uiMenu,
    },
    mixins: [ResponsiveElement],
    props: {
      group: {
        type: Object,
        required: true,
        validator(group) {
          return group.name && group.users;
        },
      },
      isUngrouped: {
        type: Boolean,
        default: false,
      },
      canMove: {
        type: Boolean,
        default: true,
      },
    },
    data() {
      return { selectedUsers: [] };
    },
    computed: {
      menuOptions() {
        return [this.$tr('renameGroup'), this.$tr('deleteGroup')];
      },
      allUsersAreSelected() {
        return (
          this.group.users.length === this.selectedUsers.length && this.selectedUsers.length !== 0
        );
      },
      someUsersAreSelected() {
        return !this.allUsersAreSelected && this.selectedUsers.length !== 0;
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
      getters: { groupModalShown: state => state.pageState.groupModalShown },
      actions: { displayModal: groupActions.displayModal },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .group-section
    margin-top: 32px

  .group-name
    display: inline-block

  .right-align
    text-align: right

  .right-margin
    margin-right: 8px

  .no-side-padding
    padding-left: 0
    padding-right: 0

  .small-text
    font-size: small

  .vertically-align
    line-height: 50px

  table
    width: 100%
    word-break: break-all

  th
    text-align: left

  td, th
    padding: 8px

  tbody
    tr
      cursor: pointer
      &:hover
        background-color: $core-grey

  thead
    .col-name, .col-username
      color: $core-text-annotation
      font-size: small

  .selectedrow
    background-color: $core-bg-canvas

  .col-checkbox
    width: 4%

  .col-name, .col-username
    width: 48%

</style>
