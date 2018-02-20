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

    <core-table v-if="group.users.length">
      <thead slot="thead">
        <tr>
          <th class="core-table-checkbox-col">
            <k-checkbox
              :label="$tr('selectAll')"
              :showLabel="false"
              :checked="allUsersAreSelected"
              :indeterminate="someUsersAreSelected"
              @change="toggleSelectAll"
            />
          </th>
          <th class="core-table-main-col">{{ $tr('name') }}</th>
          <th>{{ $tr('username') }}</th>
        </tr>
      </thead>
      <tbody slot="tbody" class="core-table-rows-selectable">
        <tr
          v-for="user in group.users"
          :key="user.id"
          :class="isSelected(user.id) ? 'core-table-row-selected' : ''"
          @click="toggleSelection(user.id)"
        >
          <td class="core-table-checkbox-col">
            <k-checkbox
              :label="$tr('selectLearner')"
              :showLabel="false"
              :checked="isSelected(user.id)"
              @change="toggleSelection(user.id)"
              @click.native.stop
            />
          </td>
          <td class="core-table-main-col">{{ user.full_name }}</td>
          <td>{{ user.username }}</td>
        </tr>
      </tbody>
    </core-table>
    <p v-else>{{ $tr('noLearners') }}</p>
  </div>

</template>


<script>

  import CoreTable from 'kolibri.coreVue.components.CoreTable';
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
      renameGroup: 'Rename group',
      deleteGroup: 'Delete group',
      name: 'Name',
      username: 'Username',
      selected: 'Selected',
      noLearners: 'No learners in this group',
      selectAll: 'Select all',
      selectLearner: 'Select learner',
    },
    components: {
      CoreTable,
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

</style>
