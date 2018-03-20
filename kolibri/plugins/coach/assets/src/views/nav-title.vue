<template>

  <div>
    <h1>
      <template v-if="username">
        {{ username }}
      </template>
      <template v-else-if="className">
        {{ className }}
      </template>
      <template v-else>
        {{ $tr('coachPageHeader') }}
      </template>
    </h1>

    <!-- HACK: infer whether coaches should appear based on whether in a page for a user -->
    <div v-if="classCoaches.length && !username">
      {{ $tr('coachListLabel') }}
      <ul>
        <li
          v-for="(coach, idx) in classCoaches"
          :key="idx"
        >
          <span>{{ coach.full_name }}</span>
        </li>
      </ul>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'navTitle',
    $trs: {
      coachPageHeader: 'Classes',
      coachListLabel: 'Coaches:',
    },
    props: {
      className: {
        type: String,
        default: null,
      },
      username: {
        type: String,
        default: null,
      },
      classCoaches: {
        type: Array,
        default: () => [],
      },
    },
  };

</script>


<style lang="stylus" scoped>

  ul, li
    margin: 0
    padding: 0
    display: inline
    list-style-type: none

  li:not(&:last-child)::after
    content: ', '

</style>
