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

    <div v-if="classCoaches.length === 1">
      {{ $tr('coach', {name: classCoaches[0].full_name}) }}
    </div>
    <div v-else-if="classCoaches.length > 1">
      <div>{{ $tr('coachesLabel', {count: classCoaches.length}) }}</div>
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
      coach: 'Coach: {name}',
      coachesLabel: '{count, plural, one {Coach} other {Coaches}}:',
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


<style lang="stylus" scoped></style>
