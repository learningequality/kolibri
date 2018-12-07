from .models import DeviceSettings


def device_provisioned():
    return DeviceSettings.objects.filter(is_provisioned=True).exists()
