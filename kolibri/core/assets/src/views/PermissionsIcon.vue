<template>

  <span class="icon" ref="icon">
    <UiIcon
      v-if="permissionType === PermissionTypes.SUPERUSER"
      :ariaLabel="$tr('superAdminTooltip')"
      class="super-admin"
    >
      <mat-svg name="vpn_key" category="communication" />
    </UiIcon>

    <UiIcon
      v-else-if="permissionType === PermissionTypes.LIMITED_PERMISSIONS"
      :ariaLabel="$tr('limitedPermissionsTooltip')"
      class="some-permissions"
    >
      <mat-svg name="vpn_key" category="communication" />
    </UiIcon>

    <UiTooltip trigger="icon">{{ tooltipText }}</UiTooltip>
  </span>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon';
  import UiTooltip from 'keen-ui/src/UiTooltip';
  import { PermissionTypes } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'PermissionsIcon',
    components: {
      UiIcon,
      UiTooltip,
    },
    props: {
      permissionType: {
        type: String,
        required: true,
        validator(value) {
          return [PermissionTypes.SUPERUSER, PermissionTypes.LIMITED_PERMISSIONS].includes(value);
        },
      },
    },
    data: () => ({
      PermissionTypes,
    }),
    computed: {
      tooltipText() {
        switch (this.permissionType) {
          case PermissionTypes.SUPERUSER:
            return this.$tr('superAdminTooltip');
          case PermissionTypes.LIMITED_PERMISSIONS:
            return this.$tr('limitedPermissionsTooltip');
          default:
            return '';
        }
      },
    },
    $trs: {
      superAdminTooltip: 'Super admin',
      limitedPermissionsTooltip: 'Limited permissions',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .icon {
    .super-admin {
      color: $core-status-mastered;
    }
    .some-permissions {
      color: $core-text-default;
    }
  }

</style>
