<template>

  <span class="pos-rel">
    <span ref="icon">
      <mat-svg
        v-if="hasSuperAdminPermission"
        class="super-admin icon"
        :style="{ fill: $coreStatusMastered }"
        name="vpn_key"
        category="communication"
      />

      <mat-svg
        v-else-if="hasLimitedPermissions"
        class="some-permissions icon"
        :style="{ fill: $coreTextDefault }"
        name="vpn_key"
        category="communication"
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

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import { PermissionTypes, UserKinds } from 'kolibri.coreVue.vuex.constants';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import KTooltip from 'kolibri.coreVue.components.KTooltip';

  export default {
    name: 'PermissionsIcon',
    components: {
      UserTypeDisplay,
      KTooltip,
    },
    mixins: [themeMixin],
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
    },
    $trs: {
      limitedPermissionsTooltip: 'Limited permissions',
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
