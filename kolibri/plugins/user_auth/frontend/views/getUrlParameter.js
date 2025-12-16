export default function getUrlParameter(name) {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get(name) || '';
}
