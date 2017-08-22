<template>

  <div>
    <table>
      <thead>
        <tr>
          <th>{{ $tr('fullName') }}</th>
          <th>{{ $tr('username') }}</th>
          <th></th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="user in facilityUsers" :key="user.id">
          <td>
            {{ user.full_name }}
          </td>
          <td>
            {{ user.username }}
          </td>
          <td>
            <k-button
              @click="goToUserPermissionsPage(user.id)"
              :raised="false"
              :text="permissionsButtonText(user.username)"
            />

            <router-link :to="`/permissions/${user.id}`">
              <span v-if="isCurrentUser(user.username)">
                {{ $tr('viewPermissions' )}}
              </span>
              <span v-else>
                {{ $tr('editPermissions' )}}
              </span>
            </router-link>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'UserGrid',
    components: {
      kButton,
    },
    computed: {

    },
    methods: {
      permissionsButtonText(username) {
        if (this.isCurrentUser(username)) {
          return this.$tr('viewPermissions' );
        }
        return this.$tr('editPermissions' );
      },
      goToUserPermissionsPage(userId) {
        this.$router.push({
          path: `/permissions/${userId}`
        });
      }

    },
    vuex: {
      getters: {
        isCurrentUser: ({ core }) => username => core.session.username === username,
        facilityUsers: ({ pageState }) => pageState.facilityUsers,
      },
      actions: {

      },
    },
    $trs: {
      viewPermissions: 'View Permissions',
      editPermissions: 'Edit Permissions',
      fullName: 'Full Name',
      username: 'Username',
    },
  }

</script>


<style lang="stylus" scoped>

</style>
