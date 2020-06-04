<template>

  <div>
    <KButton
      v-for="user in users"
      :key="user.name"
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


<style lang="scss" scoped></style>
