import urls from 'kolibri/urls';

// csvType is 'session', 'summary' or 'user'. Clicked rather than opened because
// `window.open` silently does nothing in the webviews the installed apps render Kolibri in.
export default function downloadCsvFile(csvType, facilityId) {
  const link = document.createElement('a');
  link.href = urls['kolibri:kolibri.plugins.facility:download_csv_file'](csvType, facilityId);
  // Empty value: the filename comes from the response's Content-Disposition header.
  link.download = '';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
