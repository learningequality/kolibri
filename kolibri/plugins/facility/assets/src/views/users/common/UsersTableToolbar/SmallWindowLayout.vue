<template>

  <div>
    <div class="users-header">
      <h1>
        {{ title }}
      </h1>
      <slot name="headerActions"></slot>
    </div>
    <div
      v-if="showUsersTable"
      class="users-filters"
    >
      <slot name="searchbox"></slot>
      <slot name="filterLink"></slot>
      <slot name="clearFiltersButton"></slot>
    </div>
    <div
      v-if="hasSelectedUsers"
      :style="{
        height: '1px',
        backgroundColor: $themeTokens.fineLine,
        marginBottom: '16px',
        marginLeft: '-16px',
        marginRight: '-16px',
      }"
    ></div>
    <div
      v-if="hasSelectedUsers"
      class="users-selection"
    >
      <slot name="selectionInfo"></slot>
    </div>
    <div
      v-if="showUsersTable"
      class="user-controllers"
    >
      <div
        v-if="hasSelectedUsers"
        class="user-actions"
      >
        <slot name="userActions"></slot>
      </div>
      <slot name="paginationControls"></slot>
    </div>
    <div
      v-if="showUsersTable"
      :style="{
        height: '1px',
        backgroundColor: $themeTokens.fineLine,
        marginLeft: '-16px',
        marginRight: '-16px',
      }"
    ></div>
  </div>

</template>


<script>

  export default {
    name: 'UsersTableToolbarSmallWindowLayout',
    props: {
      title: {
        type: String,
        default: '',
      },
      hasSelectedUsers: {
        type: Boolean,
        required: true,
      },
      showUsersTable: {
        type: Boolean,
        required: false,
        default: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .user-controllers {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    /deep/ nav {
      margin-left: auto;

      .pagination-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;

        * {
          margin-left: auto;
        }
      }
    }
  }

  .user-actions {
    display: flex;
    gap: 0.25em;
    align-items: center;
  }

  .users-header {
    display: flex;
    flex-wrap: wrap;
    column-gap: 16px;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
    margin-bottom: 16px;

    h1 {
      margin: 0;
      font-size: 26px;
    }
  }

  .users-filters {
    display: flex;
    gap: 16px;
    align-items: center;
    margin-bottom: 8px;
  }

  .users-selection {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

</style>
