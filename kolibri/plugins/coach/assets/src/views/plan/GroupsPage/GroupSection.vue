<template>

  <div class="group-section">

    <KGrid>
      <KGridItem sizes="100, 100, 50" percentage>
        <h2 dir="auto" class="group-name right-margin">{{ group.name }}</h2>
        <span class="small-text">
          {{ $tr('numLearners', {count: group.users.length }) }}
        </span>
      </KGridItem>
      <KGridItem
        sizes="100, 100, 50"
        percentage
        align="right"
        :class="{ mobile : windowIsSmall || windowIsMedium }"
      >
        <span v-if="group.users.length" class="right-margin small-text">
          {{ `${selectedUsers.length} ${$tr('selected')}` }}
        </span>
        <KButton
          class="right-margin"
          :text="$tr('moveLearners')"
          :primary="false"
          :disabled="!canMove || selectedUsers.length === 0"
          @click="emitMove"
        />
        <KDropdownMenu
          v-if="!isUngrouped"
          :text="$tr('options')"
          :options="menuOptions"
          @select="handleSelection"
        />
      </KGridItem>
    </KGrid>

    <CoreTable :selectable="true">
      <thead slot="thead">
        <tr>
          <th class="core-table-checkbox-col">
            <KCheckbox
              :label="$tr('selectAll')"
              :showLabel="false"
              :checked="allUsersAreSelected"
              :indeterminate="someUsersAreSelected"
              @change="toggleSelectAll"
            />
          </th>
          <th class="core-table-main-col">{{ $tr('fullNameColumnTitle') }}</th>
          <th>{{ $tr('username') }}</th>
        </tr>
      </thead>
      <transition-group slot="tbody" tag="tbody" name="list">
        <tr
          v-for="user in sortedGroupUsers"
          :key="user.id"
          @click="toggleSelection(user.id)"
        >
          <td class="core-table-checkbox-col">
            <KCheckbox
              :label="$tr('selectLearner')"
              :showLabel="false"
              :checked="isSelected(user.id)"
              @change="toggleSelection(user.id)"
              @click.native.stop
            />
          </td>
          <td dir="auto" class="core-table-main-col">{{ user.full_name }}</td>
          <td>{{ user.username }}</td>
        </tr>
      </transition-group>
    </CoreTable>

    <p v-if="!group.users.length">
      {{ $tr('noLearners') }}
    </p>

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import sortBy from 'lodash/sortBy';

  export default {
    name: 'GroupSection',
    $trs: {
      numLearners: '{count, number, integer} {count, plural, one {Learner} other {Learners}}',
      moveLearners: 'Move Learners',
      actions: 'Actions',
      renameGroup: 'Rename',
      deleteGroup: 'Delete',
      fullNameColumnTitle: 'Full name',
      username: 'Username',
      selected: 'Selected',
      noLearners: 'No learners in this group',
      selectAll: 'Select all',
      selectLearner: 'Select learner',
      options: 'Options',
    },
    components: {
      CoreTable,
      KButton,
      KCheckbox,
      KDropdownMenu,
      KGrid,
      KGridItem,
    },
    mixins: [responsiveWindow],
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
      ...mapState('groups', ['groupModalShown']),
      sortedGroupUsers() {
        return sortBy(this.group.users, user => user.full_name.toLowerCase());
      },
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

  .group-section {
    margin-top: 32px;
  }

  .group-name {
    display: inline-block;
  }

  .right-margin {
    margin-right: 8px;
  }

  .small-text {
    font-size: small;
  }

  .mobile {
    line-height: 50px;
    text-align: right;
  }

</style>
