<template>

  <span>
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

    {{ user.full_name }}
  </span>

</template>


<script>

  export default {
    components: {

    },
    props: ['user'],
    computed: {
      permissionType() {
        const permissions = this.userPermissions(this.user.id) ;
        if (!permissions) {
          return 'NO_PERMISSIONS';
        } else if (permissions.is_superuser) {
          return 'SUPERUSER';
        } else if (permissions.can_manage_content) {
          return 'SOME_PERMISSIONS';
        }
      }
    },
    methods: {

    },
    vuex: {
      getters: {
        userPermissions: state => userid => state.pageState.permissions[userid],
      },
      actions: {

      },
    },
  }

</script>


<style lang="stylus" scoped>

</style>
