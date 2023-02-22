export function setCookie(key, value, expiresInMs) {
  const currentDate = new Date();
  currentDate.setTime(currentDate.getTime() + expiresInMs);
  const expires = `expires=${currentDate.toUTCString()}`;
  window.document.cookie = `${key}=${value}; ${expires}; path=/`;
}

export function getCookie(key) {
  return window.document.cookie
    .split('; ')
    .find(cookie => cookie.startsWith(`${key}=`))
    ?.split('=')[1];
}
