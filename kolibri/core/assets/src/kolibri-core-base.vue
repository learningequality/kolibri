<template>

  <header>
    <h1>Kolibri</h1>
    <nav>
      <ul>
        <li><a href="#">Link 1</a></li>
        <li><a href="#">Link 2</a></li>
      <ul>
    </nav>
  </header>
  <main>
    <slot></slot>
  </main>
  <footer>
    Call a podiatrist – I'm in a footer!
  </footer>

</template>


<script></script>


<style scoped>

  header {
    background-color: #E3E3F3;
    padding: 10px;
    display: flex;
    justify-content: space-between;
  }

  footer {
    position: fixed;
    bottom: 1vh;
  }

</style>


<style>

  /* These global styles apply to everything */

  html, body {
    font-family: sans-serif;
  }

</style>
