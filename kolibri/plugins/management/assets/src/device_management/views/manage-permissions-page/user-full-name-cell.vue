<template>

  <span>

    <span ref="icon">
      <mat-svg
        v-if="permissionType==='SUPERUSER'"
        category="toggle"
        name="star"
        :style="{ fill: '#FBBF2E' }"
      />
      <mat-svg
        v-if="permissionType==='SOME_PERMISSIONS'"
        category="toggle"
        name="star"
        :style="{ fill: '#996189' }"
      />
      <mat-svg
        v-if="permissionType==='NO_PERMISSIONS'"
        category="social"
        name="person"
        :style="{ fill: '#686868' }"
      />
      <ui-tooltip trigger="icon">
        {{ tooltipText }}
      </ui-tooltip>
    </span>

    <span>{{ user.full_name }}</span>

  </span>

</template>


<script>

  import uiTooltip from 'keen-ui/src/UiTooltip';
  import every from 'lodash/every';
  import omit from 'lodash/omit';

  function hasNoPermissions(ps) {
    if (!ps) return true;
    return every(omit(ps, ['user']), p => !p)
  }

  export default {
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
    methods: {},
    vuex: {
      getters: {
        userPermissions: state => userid => state.pageState.permissions[userid],
      },
      actions: {},
    },
    $trs: {
      noPermissionsTooltip: 'No permissions',
      somePermissionstooltip: 'Has permissions',
      superuserTooltip: 'Superuser',
    },
  };

</script>


<style lang="stylus" scoped>

</style>
