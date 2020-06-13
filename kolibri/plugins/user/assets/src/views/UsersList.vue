<template>

  <div>
    <KButton
      v-for="user in users"
      :key="user.name"
      class="listed-user"
      style="width: 100%; text-align: left; margin-left: 0px;"
      @click="$emit('userSelected', user)"
    >

      <KIcon icon="person" style="margin-right: 8px" />

      {{ user.username }}

    </KButton>
  </div>

</template>


<script>

  export default {
    name: 'UsersList',
    props: {
      users: {
        type: Array,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .listed-user {
    width: 100%;
    margin-top: 16px;
    margin-left: 0;
    text-align: left;
    text-transform: none;
  }

</style>
