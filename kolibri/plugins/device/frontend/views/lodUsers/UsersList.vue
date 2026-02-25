<template>

  <div>
    <FilterTextbox
      v-if="isSearchable"
      v-model="searchQuery"
      :placeholder="searchForUser$()"
      class="search-filter"
    />
    <ul
      v-if="filteredUsers.length"
      class="users-list"
    >
      <li
        v-for="user in filteredUsers"
        :key="user.id"
        class="user-list-item"
        :style="{ borderBottomColor: $themeTokens.fineLine }"
      >
        <div class="user-info">
          <KIcon
            icon="person"
            class="user-icon"
          />
          <div>
            <div>
              {{ user.full_name }}
            </div>
            <div
              class="mt-4"
              :style="annotationStyle"
            >
              {{ user.username }}
            </div>
            <div v-if="isSuperuser(user)">
              <KIcon
                icon="superadmin"
                class="superadmin-icon"
              />
              <span :style="annotationStyle"> {{ superAdminLabel$() }}</span>
            </div>
          </div>
        </div>
        <slot
          v-if="!user.isImporting && !user.isImported"
          name="action"
          v-bind="{ user }"
        ></slot>
        <KCircularLoader
          v-else-if="user.isImporting"
          class="importing-loader"
          :size="24"
        />
        <p
          v-else
          class="imported"
          :style="{ color: $themeTokens.annotation }"
        >
          {{ importedLabel$() }}
        </p>
      </li>
    </ul>
    <div v-else>
      <p
        :style="{
          color: $themeTokens.textDisabled,
          textAlign: 'center',
          marginTop: '32px',
        }"
      >
        {{ noResultsLabel$() }}
      </p>
    </div>
  </div>

</template>


<script>

  import { computed, ref, toRefs } from 'vue';
  import { UserKinds } from 'kolibri/constants';
  import FilterTextbox from 'kolibri/components/FilterTextbox';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { lodUsersManagementStrings } from 'kolibri-common/strings/lodUsersManagementStrings';

  export default {
    name: 'UsersList',
    components: {
      FilterTextbox,
    },
    setup(props) {
      const searchQuery = ref('');
      const { users } = toRefs(props);

      const annotationStyle = {
        fontSize: '12px',
        color: themeTokens().annotation,
      };

      const filteredUsers = computed(() => {
        return users.value.filter(user => {
          return (
            user.username.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
            user.full_name.toLowerCase().includes(searchQuery.value.toLowerCase())
          );
        });
      });

      const isSuperuser = user => {
        return user.kind === UserKinds.SUPERUSER;
      };

      const { importedLabel$ } = lodUsersManagementStrings;
      const { noResultsLabel$, superAdminLabel$, searchForUser$ } = coreStrings;

      return {
        searchQuery,
        filteredUsers,
        annotationStyle,
        isSuperuser,
        importedLabel$,
        searchForUser$,
        noResultsLabel$,
        superAdminLabel$,
      };
    },
    props: {
      users: {
        type: Array,
        default: () => [],
      },
      isSearchable: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

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

  .mt-4 {
    margin-top: 4px;
  }

  .imported {
    padding-top: 4px;
    padding-right: 16px;
    padding-bottom: 4px;
    margin: 0;
  }

  .search-filter {
    display: block;
    margin-bottom: 16px;
    margin-left: auto;
  }

  .user-icon {
    width: 24px;
    height: 24px;
    margin-right: 16px;
  }

  .superadmin-icon {
    margin-right: 4px;
  }

  .importing-loader {
    margin-right: 0;
  }

</style>
