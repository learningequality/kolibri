window.addEventListener('message', event => {
  if (event.data.event === 'bloomdatarequested') {
    localStorage.setItem('content_url', event.data.data[0]);
    localStorage.setItem('distribution_url', event.data.data[1]);
    localStorage.setItem('meta_url', event.data.data[2]);
  }
});
