export default rubric => ({
  markers: rubric.markers.map(marker => ({ label: marker.label, selected: marker.answers })),
});
