<template>

  <KNavbar>
    <KNavbarLink
      type="icon-and-title"
      title="Trending"
      :link="{}"
    >
      <mat-svg name="trending_up" category="action" />
    </KNavbarLink>
    <KNavbarLink
      type="icon-and-title"
      title="Lit"
      :link="{ path: '#' }"
    >
      <mat-svg name="whatshot" category="social" />
    </KNavbarLink>
    <KNavbarLink
      type="icon-and-title"
      title="Favorites"
      :link="{ path: '#' }"
    >
      <mat-svg name="favorite" category="action" />
    </KNavbarLink>
  </KNavbar>

</template>


<script>

  import KNavbar from 'kolibri.coreVue.components.KNavbar';
  import KNavbarLink from 'kolibri.coreVue.components.KNavbarLink';

  export default {
    name: 'Example',
    components: {
      KNavbar,
      KNavbarLink,
    },
  };

</script>
