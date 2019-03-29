from rest_framework import viewsets
from rest_framework_csv.renderers import CSVRenderer


class CSVModelViewSet(viewsets.ModelViewSet):
    """
    Inherit from this ViewSet to create an endpoint for CSV download. In addition to standard options:
    - Set `csv_export_filename` to specify the name of the file to be exported (minus the .csv suffix)
    - Set `Meta.labels` with a dict to provide human-readable names for the fields in `Meta.fields`
    """

    csv_export_filename = 'export'

    def __init__(self, *args, **kwargs):
        super(CSVModelViewSet, self).__init__(*args, **kwargs)
        self.renderer_classes = self.generate_csv_renderer()

    def get_queryset(self):
        queryset = super(CSVModelViewSet, self).get_queryset()
        # Perform necessary eager loading of data:
        queryset = queryset.select_related('user')
        queryset = queryset.prefetch_related(
            'user',
            'user__facility')
        return queryset

    def generate_csv_renderer(self):
        """
        Dynamically create a Renderer class that inherits from CSVRenderer and sets field order/labels
        from `Meta.fields` and `Meta.labels` on the viewset's `serializer_class`.
        """
        class_name = self.serializer_class.__name__.replace("Serializer", "Renderer")
        parents = (CSVRenderer,)
        header = self.serializer_class.Meta.fields
        labels = getattr(self.serializer_class.Meta, "labels", {})
        for field in header:
            if field not in labels:
                labels[field] = field.replace("_", " ").title()
        renderer_class = type(class_name, parents, {"header": header, "labels": labels})
        return (renderer_class,)

    def finalize_response(self, request, response, *args, **kwargs):
        response = super(CSVModelViewSet, self).finalize_response(request, response, *args, **kwargs)
        response['content-disposition'] = 'attachment; filename=%s.csv' % self.csv_export_filename
        return response
