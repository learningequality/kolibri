<template>

  <tr>
    <td>
      <KLabeledIcon>
        <KIcon slot="icon" group />
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
        :text="coachStrings.$tr('optionsLabel')"
        :options="menuOptions"
        @select="handleSelection"
      />
    </td>
  </tr>

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import commonCoach from '../../common';

  export default {
    name: 'GroupRow',
    components: {
      KDropdownMenu,
      KRouterLink,
      KLabeledIcon,
      KIcon,
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
    },
    computed: {
      menuOptions() {
        return [
          this.coachStrings.$tr('renameAction'),
          this.coachStrings.$tr('deleteAction'),
          this.coachStrings.$tr('subscribeAction'),
        ];
      },
    },
    methods: {
      handleSelection(selectedOption) {
        let emitted;
        if (selectedOption === this.coachStrings.$tr('renameAction')) {
          emitted = 'rename';
        } else if (selectedOption === this.coachStrings.$tr('deleteAction')) {
          emitted = 'delete';
        } else if (selectedOption === this.coachStrings.$tr('subscribeAction')) {
          emitted = 'subscribe';
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
