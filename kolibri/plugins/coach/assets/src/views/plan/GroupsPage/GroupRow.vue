<template>

  <tr>

    <td class="core-table-icon-col">
      <mat-svg
        class="icon"
        category="action"
        name="group_work"
      />
    </td>
    <td class="core-table-main-col">
      <KRouterLink
        :text="group.name"
        :to="$router.getRoute('GroupMembersPage', { groupId: group.id })"
      />
    </td>
    <td class="ta-r">
      {{ group.users.length }}
    </td>
    <td class="ta-r">
      <KDropdownMenu
        v-if="!isUngrouped"
        appearance="flat-button"
        :text="coachStrings.$tr('optionsLabel')"
        :options="menuOptions"
        @select="handleSelection"
      />
    </td>
  </tr>

</template>


<script>

  import { mapState } from 'vuex';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import sortBy from 'lodash/sortBy';
  import commonCoach from '../../common';

  export default {
    name: 'GroupRow',
    components: {
      KDropdownMenu,
      KRouterLink,
    },
    mixins: [commonCoach, responsiveWindow],
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
    computed: {
      ...mapState('groups', ['groupModalShown']),
      sortedGroupUsers() {
        return sortBy(this.group.users, user => user.full_name.toLowerCase());
      },
      menuOptions() {
        return [this.coachStrings.$tr('renameAction'), this.coachStrings.$tr('deleteAction')];
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
        if (selectedOption === this.coachStrings.$tr('renameAction')) {
          this.$emit('rename', this.group.name, this.group.id);
        } else if (selectedOption === this.coachStrings.$tr('deleteAction')) {
          this.$emit('delete', this.group.name, this.group.id);
        }
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
  };

</script>


<style lang="scss" scoped>

  .ta-r {
    text-align: right;
  }

  .icon {
    margin-right: 8px;
    vertical-align: middle;
  }

</style>
