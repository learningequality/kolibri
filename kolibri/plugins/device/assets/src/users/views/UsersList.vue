<template>

  <ul class="users-list">
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
      <div class="user-actions">
        <KButton
          v-if="!user.isImporting"
          text="Remove"
          appearance="flat-button"
          @click="$emit('remove', user.id)"
        />
        <KCircularLoader
          v-else
          :size="24"
          style="margin: 4px auto 0;"
        />
      </div>
    </li>
  </ul>

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'UsersList',
    props: {
      users: {
        type: Array,
        default: () => [],
      },
    },
    computed: {
      annotationStyle() {
        return {
          fontSize: '12px',
          color: this.$themeTokens.annotation,
        };
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
