VECTOR_ALIAS = "vectors"

# The models that the router puts on the vector alias, as (app_label,
# model_name) pairs. The list is explicit, not a rule on the app label, so that
# a test model in testapp can be on a different alias.
_VECTOR_ALIAS_MODELS = frozenset(
    {
        ("testapp", "chunkvector"),
        ("testapp", "chunk"),
        ("testapp", "document"),
        ("testapp", "documentchunkvector"),
    }
)


def _on_vector_alias(model):
    return (model._meta.app_label, model._meta.model_name) in _VECTOR_ALIAS_MODELS


class VectorRouter:
    def db_for_read(self, model, **hints):
        return VECTOR_ALIAS if _on_vector_alias(model) else None

    def db_for_write(self, model, **hints):
        return VECTOR_ALIAS if _on_vector_alias(model) else None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if (app_label, model_name) in _VECTOR_ALIAS_MODELS:
            return db == VECTOR_ALIAS
        # This also refuses operations without a model_name hint. A RunPython
        # or RunSQL operation in a testapp migration does nothing on the vector
        # alias, and gives no error, unless it passes hints={"model_name": ...}.
        if db == VECTOR_ALIAS:
            return False
        return None
