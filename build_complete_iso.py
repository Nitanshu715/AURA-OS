import os
import sys
import tarfile
import urllib.request
import re
import subprocess
import shutil

BUILD_DIR = "/home/nitanshutak/iso_build"
EXTRACT_DIR = os.path.join(BUILD_DIR, "extracted")
APKS_DIR = os.path.join(EXTRACT_DIR, "apks", "x86_64")
ISO_SRC = "/mnt/d/AURA-OS/NitanshuOS/output/images/auraos-live.iso"
ISO_OUT_WSL = os.path.join(BUILD_DIR, "AURA-OS-v2.0-Desktop.iso")
ISO_OUT_FINAL = "/mnt/d/AURA-OS/NitanshuOS/output/images/AURA-OS-v2.0-Desktop.iso"

print("=== [1/6] Preparing Workspace in WSL 913GB ext4 ===")
subprocess.run(["rm", "-rf", BUILD_DIR])
os.makedirs(BUILD_DIR, exist_ok=True)
os.makedirs(EXTRACT_DIR, exist_ok=True)

print("=== [2/6] Extracting Base Alpine Live ISO ===")
cmd_extract = [
    "xorriso", "-osirrox", "on",
    "-indev", ISO_SRC,
    "-extract", "/", EXTRACT_DIR
]
subprocess.run(cmd_extract, check=True)

# Make entire extracted directory writable!
subprocess.run(["chmod", "-R", "777", EXTRACT_DIR], check=True)

os.makedirs(APKS_DIR, exist_ok=True)

print("=== [3/6] Resolving and Downloading All Desktop Packages ===")
MIRRORS = {
    "main": "https://dl-cdn.alpinelinux.org/alpine/v3.20/main/x86_64",
    "community": "https://dl-cdn.alpinelinux.org/alpine/v3.20/community/x86_64"
}

packages = {}
for repo, base_url in MIRRORS.items():
    idx_url = f"{base_url}/APKINDEX.tar.gz"
    idx_tar_path = os.path.join(BUILD_DIR, f"APKINDEX_{repo}.tar.gz")
    print(f"Downloading {repo} index...")
    urllib.request.urlretrieve(idx_url, idx_tar_path)
    with tarfile.open(idx_tar_path, "r:gz") as tar:
        f = tar.extractfile("APKINDEX")
        content = f.read().decode("utf-8", errors="ignore")
        current_pkg = {}
        for line in content.splitlines():
            if line.startswith("P:"):
                current_pkg["name"] = line[2:].strip()
            elif line.startswith("V:"):
                current_pkg["version"] = line[2:].strip()
            elif line.startswith("D:"):
                current_pkg["deps"] = line[2:].strip().split()
            elif line == "":
                if "name" in current_pkg:
                    name = current_pkg["name"]
                    pkg_file = f"{name}-{current_pkg.get('version', '')}.apk"
                    current_pkg["repo"] = repo
                    current_pkg["file"] = pkg_file
                    current_pkg["url"] = f"{MIRRORS[repo]}/{pkg_file}"
                    packages[name] = current_pkg
                    current_pkg = {}
        if "name" in current_pkg:
            name = current_pkg["name"]
            pkg_file = f"{name}-{current_pkg.get('version', '')}.apk"
            current_pkg["repo"] = repo
            current_pkg["file"] = pkg_file
            current_pkg["url"] = f"{MIRRORS[repo]}/{pkg_file}"
            packages[name] = current_pkg

TARGET_PACKAGES = [
    "alpine-base",
    "python3",
    "py3-requests",
    "py3-pip",
    "py3-urllib3",
    "xorg-server",
    "xf86-video-modesetting",
    "xf86-video-vesa",
    "xf86-input-libinput",
    "xinit",
    "openbox",
    "chromium",
    "xterm",
    "curl",
    "dbus",
    "mesa-dri-gallium",
    "font-dejavu",
    "udev",
    "seatd"
]

needed_packages = set()

def resolve_deps(pkg_name):
    clean_name = re.split(r'[<>=~:]', pkg_name)[0]
    if clean_name in needed_packages:
        return
    if clean_name in packages:
        needed_packages.add(clean_name)
        pkg_data = packages[clean_name]
        for dep in pkg_data.get("deps", []):
            if not dep.startswith("so:") and not dep.startswith("cmd:"):
                resolve_deps(dep)

for p in TARGET_PACKAGES:
    resolve_deps(p)

print(f"Total resolved packages to download: {len(needed_packages)}")

for pkg_name in sorted(needed_packages):
    if pkg_name in packages:
        p_info = packages[pkg_name]
        dest_file = os.path.join(APKS_DIR, p_info["file"])
        if not os.path.exists(dest_file):
            print(f"Downloading {p_info['file']} ({p_info['repo']})...")
            try:
                urllib.request.urlretrieve(p_info["url"], dest_file)
            except Exception as e:
                print(f"Warning: Failed to download {p_info['file']}: {e}")

print("=== [4/6] Creating Unified APKINDEX ===")
apk_files = [f for f in os.listdir(APKS_DIR) if f.endswith(".apk")]
print(f"Indexing {len(apk_files)} APK packages...")

index_lines = []
for apk_file in apk_files:
    m = re.match(r"^(.+)-(\d.*)\.apk$", apk_file)
    if m:
        pname, pver = m.group(1), m.group(2)
        if pname in packages:
            p_data = packages[pname]
            index_lines.append(f"P:{pname}")
            index_lines.append(f"V:{p_data.get('version', pver)}")
            if "deps" in p_data and p_data["deps"]:
                index_lines.append(f"D:{' '.join(p_data['deps'])}")
            index_lines.append(f"S:{os.path.getsize(os.path.join(APKS_DIR, apk_file))}")
            index_lines.append("")

index_bytes = "\n".join(index_lines).encode("utf-8")
index_tar_path = os.path.join(APKS_DIR, "APKINDEX.tar.gz")
with tarfile.open(index_tar_path, "w:gz") as tar:
    ti = tarfile.TarInfo(name="APKINDEX")
    ti.size = len(index_bytes)
    import io
    tar.addfile(ti, io.BytesIO(index_bytes))

print("=== [5/6] Packaging AURA-OS Core & Autostart Overlay ===")
overlay_dir = os.path.join(BUILD_DIR, "overlay")
os.makedirs(overlay_dir, exist_ok=True)
os.makedirs(os.path.join(overlay_dir, "etc", "local.d"), exist_ok=True)
os.makedirs(os.path.join(overlay_dir, "etc", "apk"), exist_ok=True)
os.makedirs(os.path.join(overlay_dir, "root"), exist_ok=True)
os.makedirs(os.path.join(overlay_dir, "aura_core"), exist_ok=True)

# 1. /etc/inittab
with open(os.path.join(overlay_dir, "etc", "inittab"), "w") as f:
    f.write("""::sysinit:/sbin/openrc sysinit
::sysinit:/sbin/openrc boot
::wait:/sbin/openrc default

tty1::respawn:/sbin/getty -n -l /bin/sh 38400 tty1
tty2::respawn:/sbin/getty 38400 tty2

::ctrlaltdel:/sbin/reboot
::shutdown:/sbin/openrc shutdown
""")

# 2. /etc/hostname
with open(os.path.join(overlay_dir, "etc", "hostname"), "w") as f:
    f.write("AURA-OS\n")

# 3. /etc/apk/world
with open(os.path.join(overlay_dir, "etc", "apk", "world"), "w") as f:
    f.write("\n".join(TARGET_PACKAGES) + "\n")

# 4. /etc/local.d/aura.start
with open(os.path.join(overlay_dir, "etc", "local.d", "aura.start"), "w") as f:
    f.write("""#!/bin/sh
# Bring up network
ifup -a 2>/dev/null || true

# Start AURA-OS Python Core Backend
cd /aura_core
python3 server.py --host 0.0.0.0 --port 8888 > /var/log/aura.log 2>&1 &

# Auto launch X11 and Chromium Kiosk
if [ ! -f /tmp/.x_started ]; then
    touch /tmp/.x_started
    startx -- -nocursor > /var/log/xorg.log 2>&1 &
fi
""")
os.chmod(os.path.join(overlay_dir, "etc", "local.d", "aura.start"), 0o755)

# 5. /root/.xinitrc
with open(os.path.join(overlay_dir, "root", ".xinitrc"), "w") as f:
    f.write("""#!/bin/sh
openbox &

# Wait for server
sleep 2

# Launch fullscreen Chromium Kiosk
chromium --no-sandbox --test-type --kiosk --start-maximized --disable-infobars --noerrdialogs --disable-session-crashed-bubble http://localhost:8888
""")
os.chmod(os.path.join(overlay_dir, "root", ".xinitrc"), 0o755)

# 6. Copy aura_core
shutil.copytree("/mnt/d/AURA-OS/aura_core", os.path.join(overlay_dir, "aura_core"), dirs_exist_ok=True)

# 7. Create localhost.apkovl.tar.gz and AURA-OS.apkovl.tar.gz
apkovl_target1 = os.path.join(EXTRACT_DIR, "localhost.apkovl.tar.gz")
apkovl_target2 = os.path.join(EXTRACT_DIR, "AURA-OS.apkovl.tar.gz")

with tarfile.open(apkovl_target1, "w:gz") as tar:
    for root, dirs, files in os.walk(overlay_dir):
        for file in files:
            full_p = os.path.join(root, file)
            rel_p = os.path.relpath(full_p, overlay_dir)
            tar.add(full_p, arcname=rel_p)

shutil.copyfile(apkovl_target1, apkovl_target2)

print("=== [6/6] Generating Bootable Turnkey Desktop ISO ===")
xorriso_cmd = [
    "xorriso", "-as", "mkisofs",
    "-iso-level", "3",
    "-full-iso-debug",
    "-volid", "AURA_LIVE",
    "-eltorito-boot", "boot/syslinux/isolinux.bin",
    "-eltorito-catalog", "boot/syslinux/boot.cat",
    "-no-emul-boot", "-boot-load-size", "4", "-boot-info-table",
    "-output", ISO_OUT_WSL,
    EXTRACT_DIR
]
subprocess.run(xorriso_cmd, check=True)

print("Copying final ISO to Windows workspace...")
shutil.copyfile(ISO_OUT_WSL, ISO_OUT_FINAL)
print(f"SUCCESS! Turnkey Graphical ISO generated at: {ISO_OUT_FINAL}")
