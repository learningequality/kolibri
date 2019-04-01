popen_responses = {
    "mount": """
/dev/mapper/ubuntu--vg-root on / type ext4 (rw,errors=remount-ro)
proc on /proc type proc (rw,noexec,nosuid,nodev)
sysfs on /sys type sysfs (rw,noexec,nosuid,nodev)
none on /sys/fs/cgroup type tmpfs (rw)
none on /sys/fs/fuse/connections type fusectl (rw)
none on /sys/kernel/debug type debugfs (rw)
none on /sys/kernel/security type securityfs (rw)
udev on /dev type devtmpfs (rw,mode=0755)
devpts on /dev/pts type devpts (rw,noexec,nosuid,gid=5,mode=0620)
tmpfs on /run type tmpfs (rw,noexec,nosuid,size=10%,mode=0755)
none on /run/lock type tmpfs (rw,noexec,nosuid,nodev,size=5242880)
none on /run/shm type tmpfs (rw,nosuid,nodev)
none on /run/user type tmpfs (rw,noexec,nosuid,nodev,size=104857600,mode=0755)
none on /sys/fs/pstore type pstore (rw)
/dev/sda1 on /boot type ext2 (rw)
binfmt_misc on /proc/sys/fs/binfmt_misc type binfmt_misc (rw,noexec,nosuid,nodev)
rpc_pipefs on /run/rpc_pipefs type rpc_pipefs (rw)
systemd on /sys/fs/cgroup/systemd type cgroup (rw,noexec,nosuid,nodev,none,name=systemd)
192.168.1.1:/nas on /share type nfs (rw,hard,intr,nolock,vers=4,addr=192.168.1.96,clientaddr=192.168.1.2)
/home/user/.Private on /home/user type ecryptfs (ecryptfs_check_dev_ruid,ecryptfs_cipher=aes,ecryptfs_key_bytes=16,ecryptfs_unlink_sigs)
gvfsd-fuse on /run/user/1000/gvfs type fuse.gvfsd-fuse (rw,nosuid,nodev,user=user)
/dev/sdb1 on /media/user/F571-7814 type vfat (rw,nosuid,nodev,uid=1000,gid=1000,shortname=mixed,dmask=0077,utf8=1,showexec,flush,uhelper=udisks2)
/dev/sdb2 on /media/user/KEEPOD type ext4 (rw,nosuid,nodev,uhelper=udisks2)
/dev/mmcblk0p1 on /media/user/disk type vfat (rw,nosuid,nodev,uid=1000,gid=1000,shortname=mixed,dmask=0077,utf8=1,showexec,flush,uhelper=udisks2)
    """
}

disk_sizes = {
    "/": {"free": 12704473088, "total": 117579513856, "used": 104875040768},
    "/media/user/F571-7814": {
        "free": 772001792,
        "total": 2142232576,
        "used": 1370230784,
    },
    "/media/user/KEEPOD": {"free": 4997480448, "total": 5629046784, "used": 631566336},
    "/media/user/disk": {"free": 11328000, "total": 31801344, "used": 20473344},
}

os_access_read = {
    "/": True,
    "/media/user/F571-7814": True,
    "/media/user/KEEPOD": False,
    "/media/user/disk": True,
}

os_access_write = {
    "/": True,
    "/media/user/F571-7814": False,
    "/media/user/KEEPOD": False,
    "/media/user/disk": False,
    "/media/user/F571-7814/KOLIBRI_DATA": True,
}

has_kolibri_data_folder = {
    "/": False,
    "/media/user/F571-7814": True,
    "/media/user/KEEPOD": False,
    "/media/user/disk": False,
}
