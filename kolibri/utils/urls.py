from django.core.validators import URLValidator

validator = URLValidator(schemes=["http", "https"])
# Need to do this as the default message is a lazily translated string
# which then tries to invoke the Django settings, so would not work
# outside of a Django setup context.
validator.message = "Invalid URL"
