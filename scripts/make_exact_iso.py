import os
import sys
import pycdlib

iso_out = r"D:\AURA-OS\NitanshuOS\output\images\AURA-OS-v2.0-Desktop.iso"
src_dir = r"C:\AURA_BUILD\extracted"

print(f"Creating Bootable ISO {iso_out} with pycdlib preserving exact Rock Ridge and ISO9660 paths...")

iso = pycdlib.PyCdlib()
iso.new(
    interchange_level=3,
    rock_ridge='1.09',
    vol_ident='AURA_LIVE'
)

# 1. Add directories
for root, dirs, files in os.walk(src_dir):
    rel_root = os.path.relpath(root, src_dir).replace('\\', '/')
    if rel_root != ".":
        iso.add_directory("/" + rel_root, rr_name=os.path.basename(root))

# 2. Add files
for root, dirs, files in os.walk(src_dir):
    rel_root = os.path.relpath(root, src_dir).replace('\\', '/')
    for f in sorted(files):
        if rel_root == "boot/syslinux" and f == "boot.cat":
            continue
        full_path = os.path.join(root, f)
        if rel_root == ".":
            iso_file_path = "/" + f
        else:
            iso_file_path = "/" + rel_root + "/" + f
            
        iso.add_file(full_path, iso_path=iso_file_path + ";1", rr_name=f)

# 3. Add El Torito Boot
iso.add_eltorito(
    "/boot/syslinux/isolinux.bin;1",
    bootcatfile="/boot/syslinux/boot.cat;1",
    rr_bootcatname="boot.cat",
    boot_info_table=True,
    media_name="noemul"
)

print("Writing ISO...")
iso.write(iso_out)
iso.close()
print(f"SUCCESS! ISO generated at {iso_out} (Size: {os.path.getsize(iso_out)} bytes)")
