<template>

  <tr>
    <td>
      <KRouterLink
        :text="group.name"
        :to="$router.getRoute('GroupMembersPage', { groupId: group.id })"
        icon="group"
      />
    </td>
    <td>
      {{ $formatNumber(group.users.length) }}
    </td>
    <td class="core-table-button-col">
      <KButton
        hasDropdown
        appearance="flat-button"
        :text="coreString('optionsLabel')"
      >
        <template #menu>
          <KDropdownMenu
            :options="menuOptions"
            @select="handleSelection"
          />
        </template>
      </KButton>
    </td>
  </tr>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../../common';

  export default {
    name: 'GroupRow',
    mixins: [commonCoach, commonCoreStrings],
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
        return [
          this.coachString('renameGroupAction'),
          this.coachString('enrollLearnersAction'),
          this.coreString('deleteAction'),
        ];
      },
    },
    methods: {
      handleSelection(selectedOption) {
        switch (selectedOption) {
          case this.coachString('renameGroupAction'):
            this.$emit('rename', this.group.name, this.group.id);
            break;
          case this.coachString('enrollLearnersAction'):
            this.$emit('enroll', this.group.name, this.group.id);
            break;
          case this.coreString('deleteAction'):
            this.$emit('delete', this.group.name, this.group.id);
            break;
          default:
            // eslint-disable-next-line no-console
            console.warn(
              `GroupRow: Tried to handleSelection of ${selectedOption}, but that isn't being handled.`,
            );
        }
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
