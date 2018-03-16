<template>

  <span class="icon" ref="icon">
    <ui-icon
      v-if="permissionType === PermissionTypes.SUPERUSER"
      :ariaLabel="$tr('superuserTooltip')"
      icon="vpn_key"
      class="superuser"
    />

    <ui-icon
      v-else-if="permissionType === PermissionTypes.LIMITED_PERMISSIONS"
      :ariaLabel="$tr('limitedPermissionsTooltip')"
      icon="vpn_key"
      class="some-permissions"
    />

    <ui-tooltip trigger="icon">{{ tooltipText }}</ui-tooltip>
  </span>

</template>


<script>

  import uiIcon from 'keen-ui/src/UiIcon';
  import uiTooltip from 'keen-ui/src/UiTooltip';
  import { PermissionTypes } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'permissionsIcon',
    components: {
      uiIcon,
      uiTooltip,
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
            return this.$tr('superuserTooltip');
          case PermissionTypes.LIMITED_PERMISSIONS:
            return this.$tr('limitedPermissionsTooltip');
          default:
            return '';
        }
      },
    },
    $trs: {
      superuserTooltip: 'Superuser',
      limitedPermissionsTooltip: 'Limited permissions',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .icon
    .superuser
      color: $core-status-mastered
    .some-permissions
      color: $core-text-default

</style>
