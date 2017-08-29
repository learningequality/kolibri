<template>

  <span>

    <span class="icon" ref="icon">
      <mat-svg
        v-if="permissionType==='SUPERUSER'"
        category="toggle"
        name="star"
        class="superuser"
      />
      <mat-svg
        v-if="permissionType==='SOME_PERMISSIONS'"
        category="toggle"
        name="star"
        class="some-permissions"
      />
      <mat-svg
        v-if="permissionType==='NO_PERMISSIONS'"
        category="social"
        name="person"
        class="no-permissions"
      />
      <ui-tooltip trigger="icon">
        {{ tooltipText }}
      </ui-tooltip>
    </span>

    <span class="align">{{ user.full_name }}</span>

  </span>

</template>


<script>

  import uiTooltip from 'keen-ui/src/UiTooltip';
  import every from 'lodash/every';
  import omit from 'lodash/omit';

  function hasNoPermissions(ps) {
    if (!ps) return true;
    return every(omit(ps, ['user']), p => !p);
  }

  export default {
    name: 'userFullNameCell',
    components: {
      uiTooltip,
    },
    props: ['user'],
    computed: {
      permissionType() {
        const permissions = this.userPermissions(this.user.id);
        if (hasNoPermissions(permissions)) {
          return 'NO_PERMISSIONS';
        } else if (permissions.is_superuser) {
          return 'SUPERUSER';
        } else if (permissions.can_manage_content) {
          return 'SOME_PERMISSIONS';
        }
      },
      tooltipText() {
        switch (this.permissionType) {
          case 'NO_PERMISSIONS':
            return this.$tr('noPermissionsTooltip');
          case 'SUPERUSER':
            return this.$tr('superuserTooltip');
          case 'SOME_PERMISSIONS':
            return this.$tr('somePermissionstooltip');
          default:
            return 'No Permissions';
        }
      },
    },
    vuex: {
      getters: {
        userPermissions: state => userid => state.pageState.permissions[userid],
      },
    },
    $trs: {
      noPermissionsTooltip: 'No permissions',
      somePermissionstooltip: 'Has permissions',
      superuserTooltip: 'Superuser',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .align
    vertical-align: super

  .icon
    margin-right: 0.5em
    .no-permissions
      fill: $core-text-annotation
    .superuser
      fill: $core-status-mastered
    .some-permissions
      fill: $core-action-normal

</style>
