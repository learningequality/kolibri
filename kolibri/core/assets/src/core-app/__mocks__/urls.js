const urls = new Proxy(
  {},
  {
    get() {
      return () => '';
    },
  }
);

export default urls;
