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
      v-if="showUsersTable"
      class="user-controllers"
    >
      <div class="user-actions-container">
        <div class="user-actions">
          <slot name="userActions"></slot>
        </div>
        <div
          v-if="hasSelectedUsers"
          class="users-selection"
        >
          <slot name="selectionInfo"></slot>
        </div>
      </div>
      <slot name="paginationControls"></slot>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'UsersTableToolbarNormalLayout',
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
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    :last-child {
      margin-left: auto;
    }
  }

  .user-actions-container {
    display: flex;
    gap: 16px;
    align-items: center;
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
    margin-bottom: 24px;

    h1 {
      margin: 0;
    }
  }

  .users-filters {
    display: flex;
    gap: 16px;
    align-items: center;
    margin-bottom: 16px;
  }

  .users-selection {
    display: flex;
    gap: 8px;
    align-items: center;
  }

</style>
