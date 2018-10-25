<template>

  <!-- UiTooltip automatically uses aria-describedby, pointing to UiTooltip element -->
  <span ref="permission-icon" class="permission-icon">
    <mat-svg
      v-if="hasSuperAdminPermission"
      class="super-admin icon"
      name="vpn_key"
      category="communication"
    />

    <mat-svg
      v-else-if="hasLimitedPermissions"
      class="some-permissions icon"
      name="vpn_key"
      category="communication"
    />

    <UiTooltip
      :position="tooltipPosition"
      trigger="permission-icon"
    >

      <UserTypeDisplay
        v-if="hasSuperAdminPermission"
        :userType="UserKinds.SUPERUSER"
      />

      <template v-else-if="hasLimitedPermissions">
        {{ $tr('limitedPermissionsTooltip') }}
      </template>
    </UiTooltip>
  </span>

</template>


<script>

  import UiTooltip from 'keen-ui/src/UiTooltip';
  import { PermissionTypes, UserKinds } from 'kolibri.coreVue.vuex.constants';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';

  export default {
    name: 'PermissionsIcon',
    components: {
      UiTooltip,
      UserTypeDisplay,
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
    computed: {
      UserKinds() {
        return UserKinds;
      },
      hasSuperAdminPermission() {
        return this.permissionType === PermissionTypes.SUPERUSER;
      },
      hasLimitedPermissions() {
        return this.permissionType === PermissionTypes.LIMITED_PERMISSIONS;
      },
      tooltipPosition() {
        return `bottom ${this.isRtl ? 'right' : 'left'}`;
      },
    },
    $trs: {
      limitedPermissionsTooltip: 'Limited permissions',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .icon {
    vertical-align: text-bottom;

    &.super-admin {
      fill: $core-status-mastered;
    }
    &.some-permissions {
      fill: $core-text-default;
    }
  }

</style>
