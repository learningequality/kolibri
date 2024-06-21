<template>

  <div>
    <FilterTextbox
      v-if="isSearchable"
      v-model="searchQuery"
      placeholder="Search for a user"
      :style="{ marginBottom: '16px', marginLeft: 'auto', display: 'block' }"
    />
    <ul class="users-list">
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
              <span :style="annotationStyle"> Super admin</span>
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
          style="margin-right: 0;"
        />
        <p v-else class="imported">
          Imported
        </p>
      </li>
    </ul>
  </div>

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import FilterTextbox from 'kolibri.coreVue.components.FilterTextbox';

  export default {
    name: 'UsersList',
    components: {
      FilterTextbox,
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
    data() {
      return {
        searchQuery: '',
      };
    },
    computed: {
      annotationStyle() {
        return {
          fontSize: '12px',
          color: this.$themeTokens.annotation,
        };
      },
      filteredUsers() {
        return this.users.filter(user => {
          return (
            user.username.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
            user.full_name.toLowerCase().includes(this.searchQuery.toLowerCase())
          );
        });
      },
    },
    methods: {
      isSuperuser(user) {
        return user.kind === UserKinds.SUPERUSER;
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

</style>
