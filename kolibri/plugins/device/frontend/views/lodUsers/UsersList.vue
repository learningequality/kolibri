<template>

  <div>
    <FilterTextbox
      v-if="isSearchable"
      v-model="searchQuery"
      :placeholder="searchForUser$()"
      :style="{ marginBottom: '16px', marginLeft: 'auto', display: 'block' }"
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
            :style="{
              height: '24px',
              width: '24px',
              marginRight: '16px',
            }"
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
                :style="{
                  marginRight: '4px',
                }"
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
          :size="24"
          style="margin-right: 0"
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

</style>
