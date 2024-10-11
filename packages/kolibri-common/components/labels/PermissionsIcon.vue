<template>

  <span class="pos-rel">
    <span ref="icon">
      <KIcon
        v-if="hasSuperAdminPermission"
        class="icon super-admin"
        :style="iconStyle"
        icon="permission"
      />

      <KIcon
        v-else-if="hasLimitedPermissions"
        class="icon some-permissions"
        :style="iconStyle"
        icon="permission"
      />
    </span>
    <KTooltip
      reference="icon"
      :refs="$refs"
    >
      <UserTypeDisplay
        v-if="hasSuperAdminPermission"
        :userType="UserKinds.SUPERUSER"
      />
      <template v-else-if="hasLimitedPermissions">
        {{ $tr('limitedPermissionsTooltip') }}
      </template>
    </KTooltip>
  </span>

</template>


<script>

  import { PermissionTypes, UserKinds } from 'kolibri/constants';
  import UserTypeDisplay from 'kolibri-common/components/UserTypeDisplay';

  export default {
    name: 'PermissionsIcon',
    components: {
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
      lightIcon: {
        type: Boolean,
        default: false,
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
      iconStyle() {
        if (this.hasSuperAdminPermission) {
          return {
            fill: this.lightIcon ? this.$themePalette.yellow.v_200 : this.$themeTokens.superAdmin,
          };
        } else {
          return {
            fill: this.lightIcon ? this.$themeTokens.disabled : this.$themeTokens.text,
          };
        }
      },
    },
    $trs: {
      limitedPermissionsTooltip: {
        message: 'Limited permissions',
        context:
          "It's a tooltip for the 'black key' icon that indicates that the user has permissions to manage content, but not other users or facility settings.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .pos-rel {
    position: relative;
  }

  // from KIcon
  svg {
    position: relative;
    top: 0.125em;
    width: 1.125em;
    height: 1.125em;
  }

</style>
