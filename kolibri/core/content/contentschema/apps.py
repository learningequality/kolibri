from kolibri.core.content.apps import KolibriContentConfig


class ContentSchemaConfig(KolibriContentConfig):
    name = "kolibri.core.content.contentschema"

    def ready(self):
        pass
