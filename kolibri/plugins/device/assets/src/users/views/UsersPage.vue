<template>

  <AppBarPage
    :title="coreString('usersLabel')"
    class="users-page"
  >
    <KPageContainer>
      <div class="header">
        <h1>{{ coreString('usersLabel') }} </h1>
        <KButton
          text="Import User"
        />
      </div>
      <KCircularLoader v-if="loading" />
      <ul v-else class="users-list">
        <li
          v-for="user in users"
          :key="user.id"
          class="user-list-item"
          :style="{ borderBottomColor: $themeTokens.fineLine }"
        >
          <div class="user-info">
            <KIcon
              icon="person"
              :style="{
                height: '24px',
                width: '24px',
                marginRight: '8px',
              }"
            />
            <div>
              <div>
                {{ user.full_name }}
              </div>
              <div
                :style="{
                  fontSize: '12px',
                  color: $themeTokens.annotation,
                }"
              >
                {{ user.username }}
              </div>
            </div>
          </div>
          <div class="user-actions">
            <KButton
              text="Remove"
              appearance="flat-button"
            />
          </div>
        </li>
      </ul>
    </KPageContainer>
  </AppBarPage>

</template>


<script>

  import AppBarPage from 'kolibri.coreVue.components.AppBarPage';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useUsers from '../composables/useUsers';

  export default {
    name: 'UsersPage',
    components: {
      AppBarPage,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { fetchUsers, users, loading } = useUsers();

      fetchUsers();

      return {
        loading,
        users,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .users-list {
    padding: 0;
    list-style: none;

    .user-list-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;

      &:not(:last-child) {
        border-bottom: 1px solid;
      }

      .user-info {
        display: flex;
        align-items: center;
      }
    }
  }

</style>
