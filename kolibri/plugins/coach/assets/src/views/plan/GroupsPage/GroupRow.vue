<template>

  <tr>
    <td>
      <KLabeledIcon icon="group">
        <KRouterLink
          :text="group.name"
          :to="$router.getRoute('GroupMembersPage', { groupId: group.id })"
        />
      </KLabeledIcon>
    </td>
    <td>
      {{ group.users.length }}
    </td>
    <td class="core-table-button-col">
      <KDropdownMenu
        appearance="flat-button"
        :text="coreString('optionsLabel')"
        :options="menuOptions"
        @select="handleSelection"
      />
    </td>
  </tr>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../../common';

  export default {
    name: 'GroupRow',
    mixins: [commonCoach, commonCoreStrings, responsiveWindowMixin],
    props: {
      group: {
        type: Object,
        required: true,
        validator(group) {
          return group.name && group.users;
        },
      },
    },
    computed: {
      menuOptions() {
        return [this.coachString('renameAction'), this.coreString('deleteAction')];
      },
    },
    methods: {
      handleSelection(selectedOption) {
        let emitted;
        if (selectedOption === this.coachString('renameAction')) {
          emitted = 'rename';
        } else if (selectedOption === this.coreString('deleteAction')) {
          emitted = 'delete';
        }
        this.$emit(emitted, this.group.name, this.group.id);
      },
    },
  };

</script>


<style lang="scss" scoped>

  .icon {
    margin-right: 8px;
    vertical-align: middle;
  }

</style>
