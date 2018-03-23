<template>

  <div>
    <h2>
      <template v-if="className">
        {{ className }}
      </template>
      <template v-else>
        {{ $tr('coachPageHeader') }}
      </template>
    </h2>

    <div v-if="classCoaches.length">
      <span> {{ $tr('coachListLabel') }} </span>
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
