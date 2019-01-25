export default function setWebpackPublicPath(urls) {
  if (process.env.NODE_ENV === 'production') {
    /* eslint-disable no-undef */
    __webpack_public_path__ = urls.static(`${__kolibriModuleName}/`);
    /* eslint-enable */
  }
}
