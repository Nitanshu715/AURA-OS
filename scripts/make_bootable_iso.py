import os
import sys
import pycdlib
import re

iso_out = r"D:\AURA-OS\NitanshuOS\output\images\AURA-OS-v2.0-Desktop.iso"
src_dir = r"C:\AURA_BUILD\extracted"

# Also create isolinux.cfg in syslinux dir as alias
syslinux_dir = os.path.join(src_dir, "boot", "syslinux")
if os.path.exists(syslinux_dir):
    cfg_src = os.path.join(syslinux_dir, "syslinux.cfg")
    cfg_dst = os.path.join(syslinux_dir, "isolinux.cfg")
    if os.path.exists(cfg_src):
        with open(cfg_src, "r") as f:
            cfg_data = f.read()
        with open(cfg_dst, "w") as f:
            f.write(cfg_data)

print(f"Creating Bootable ISO {iso_out} from {src_dir} using pycdlib...")

iso = pycdlib.PyCdlib()
iso.new(
    interchange_level=3,
    rock_ridge='1.09',
    vol_ident='AURA_LIVE'
)

def clean_iso_name(name, is_dir=False):
    # Convert name to uppercase valid ISO9660 character sequence
    clean = re.sub(r'[^A-Za-z0-9_.]', '_', name).upper()
    if is_dir:
        clean = clean.replace('.', '_')
        return clean[:30]
    else:
        # Format as NAME.EXT;1
        parts = clean.split('.')
        if len(parts) == 1:
            base, ext = parts[0], ""
        else:
            base, ext = "_".join(parts[:-1]), parts[-1]
        base = base[:20]
        ext = ext[:8]
        if ext:
            return f"{base}.{ext};1"
        else:
            return f"{base};1"

dir_map = {"": ""}
eltorito_bootfile = None

# 1. Walk directories and add them
for root, dirs, files in os.walk(src_dir):
    rel_root = os.path.relpath(root, src_dir).replace('\\', '/')
    if rel_root == ".":
        curr_iso_dir = ""
    else:
        curr_iso_dir = dir_map[rel_root]

    # Add subdirectories
    for d in sorted(dirs):
        dir_rel_path = f"{rel_root}/{d}".lstrip("./")
        iso_dir_name = clean_iso_name(d, is_dir=True)
        iso_dir_path = curr_iso_dir + "/" + iso_dir_name
        dir_map[dir_rel_path] = iso_dir_path
        print(f"Adding dir: {dir_rel_path} -> {iso_dir_path}")
        iso.add_directory(iso_dir_path, rr_name=d)

# 2. Add files
for root, dirs, files in os.walk(src_dir):
    rel_root = os.path.relpath(root, src_dir).replace('\\', '/')
    if rel_root == ".":
        curr_iso_dir = ""
    else:
        curr_iso_dir = dir_map[rel_root]

    for f in sorted(files):
        full_path = os.path.join(root, f)
        if rel_root == "boot/syslinux" and f == "boot.cat":
            continue
        
        iso_fname = clean_iso_name(f, is_dir=False)
        iso_file_path = curr_iso_dir + "/" + iso_fname
        print(f"Adding file: {f} ({iso_file_path})")
        
        # Check unique
        iso.add_file(full_path, iso_path=iso_file_path, rr_name=f)
        
        if rel_root == "boot/syslinux" and f == "isolinux.bin":
            eltorito_bootfile = iso_file_path

if eltorito_bootfile:
    print(f"Configuring El Torito boot with bootfile: {eltorito_bootfile}")
    iso.add_eltorito(
        eltorito_bootfile,
        bootcatfile="/BOOT/SYSLINUX/BOOT.CAT;1",
        boot_info_table=True,
        media_name="noemul"
    )

print("Writing ISO image...")
os.makedirs(os.path.dirname(iso_out), exist_ok=True)
iso.write(iso_out)
iso.close()
print(f"SUCCESS! Created bootable ISO: {iso_out} (Size: {os.path.getsize(iso_out)} bytes)")
