import itertools


def sequence(template):
    """
    Returns a zero-arg callable suitable for use as a field_defaults()
    value, formatting `template` with a counter that increments once per
    call (factory_boy's Sequence, without the dependency).
    """
    counter = itertools.count()
    return lambda: template % next(counter)


class ModelFactory:
    """
    Minimal stand-in for factory_boy's DjangoModelFactory: direct
    instantiation or .create() both build-and-save a model instance from
    field defaults, computed lazily so that overriding a field skips its
    default entirely.
    """

    model = None

    def __new__(cls, **kwargs):
        return cls.create(**kwargs)

    @classmethod
    def field_defaults(cls):
        return {}

    @classmethod
    def create(cls, **kwargs):
        fields = {
            name: default() if callable(default) else default
            for name, default in cls.field_defaults().items()
            if name not in kwargs
        }
        fields.update(kwargs)
        return cls.model.objects.create(**fields)
