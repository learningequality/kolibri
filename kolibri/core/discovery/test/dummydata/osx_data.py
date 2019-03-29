popen_responses = {
    "mount": """
/dev/disk0s2 on / (hfs, local, journaled)
devfs on /dev (devfs, local, nobrowse)
map -hosts on /net (autofs, nosuid, automounted, nobrowse)
map auto_home on /home (autofs, automounted, nobrowse)
/dev/disk1s1 on /Volumes/HP v125w (msdos, local, nodev, nosuid, noowners)
/dev/disk2s1 on /Volumes/NO NAME (msdos, local, nodev, nosuid, noowners)
    """,
    "diskutil info /dev/disk1s1": """
   Device Identifier:        disk1s1
   Device Node:              /dev/disk1s1
   Part Of Whole:            disk1
   Device / Media Name:      Untitled 1

   Volume Name:
   Escaped with Unicode:

   Mounted:                  Yes
   Mount Point:              /Volumes/Untitled
   Escaped with Unicode:     /Volumes/Untitled

   File System:              MS-DOS FAT16
   Type:                     msdos
   Name:                     MS-DOS (FAT16)

   Partition Type:           DOS_FAT_16_S
   Bootable:                 Not bootable
   Media Type:               Generic
   Protocol:                 USB
   SMART Status:             Not Supported

   Total Size:               32.1 MB (32079872 Bytes) (exactly 62656 512-Byte-Blocks)
   Volume Free Space:        11.3 MB (11322368 Bytes) (exactly 22114 512-Byte-Blocks)

   Read-Only Media:          No
   Read-Only Volume:         No
   Ejectable:                Yes

   Whole:                    No
   Internal:                 No
    """,
    "diskutil info /dev/disk2s1": """
   Device Identifier:        disk2s1
   Device Node:              /dev/disk2s1
   Part Of Whole:            disk2
   Device / Media Name:      Untitled 1

   Volume Name:              NO NAME
   Escaped with Unicode:     NO%FF%FE%20%00NAME

   Mounted:                  Yes
   Mount Point:              /Volumes/NO NAME
   Escaped with Unicode:     /Volumes/NO%FF%FE%20%00NAME

   File System:              MS-DOS FAT32
   Type:                     msdos
   Name:                     MS-DOS (FAT32)

   Partition Type:           DOS_FAT_32
   Bootable:                 Not bootable
   Media Type:               Generic
   Protocol:                 USB
   SMART Status:             Not Supported

   Total Size:               2.1 GB (2146434560 Bytes) (exactly 4192255 512-Byte-Blocks)
   Volume Free Space:        772.0 MB (771989504 Bytes) (exactly 1507792 512-Byte-Blocks)

   Read-Only Media:          No
   Read-Only Volume:         No
   Ejectable:                Yes

   Whole:                    No
   Internal:                 No
    """,
    "diskutil info /dev/disk0s2": """

   Device Identifier:        disk0s2
   Device Node:              /dev/disk0s2
   Part Of Whole:            disk0
   Device / Media Name:      Customer

   Volume Name:              Macintosh HD
   Escaped with Unicode:     Macintosh%FF%FE%20%00HD

   Mounted:                  Yes
   Mount Point:              /
   Escaped with Unicode:     /

   File System:              Journaled HFS+
   Type:                     hfs
   Name:                     Mac OS Extended (Journaled)
   Journal:                  Journal size 16384 KB at offset 0x15502000
   Owners:                   Enabled

   Partition Type:           Apple_HFS
   Bootable:                 Is bootable
   Media Type:               Generic
   Protocol:                 SATA
   SMART Status:             Verified
   Volume UUID:              70AE9605-40D1-3AAA-A127-38B7FB6FEF94

   Total Size:               121.0 GB (120988852224 Bytes) (exactly 236306352 512-Byte-Blocks)
   Volume Free Space:        20.6 GB (20628480000 Bytes) (exactly 40290000 512-Byte-Blocks)

   Read-Only Media:          No
   Read-Only Volume:         No
   Ejectable:                No

   Whole:                    No
   Internal:                 Yes
    """,
}

disk_sizes = {
    "/Volumes/HP v125w": {"free": 1234, "total": 45678, "used": 45678 - 1234},
    "/": {"free": 0, "total": 1000, "used": 1000},
}

os_access_read = {"/": True, "/Volumes/HP v125w": True, "/Volumes/NO NAME": False}

os_access_write = {
    "/": False,
    "/Volumes/HP v125w": False,
    "/Volumes/NO NAME": False,
    "/Volumes/HP v125w/KOLIBRI_DATA": True,
}

has_kolibri_data_folder = {
    "/": False,
    "/Volumes/HP v125w": True,
    "/Volumes/NO NAME": False,
}
