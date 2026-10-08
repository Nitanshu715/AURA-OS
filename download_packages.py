import os
import sys
import tarfile
import urllib.request
import re
import subprocess
import shutil

print("=== Starting AURA-OS Turnkey ISO Builder ===")

BASE_DIR = r"D:\AURA-OS"
ISO_DIR = os.path.join(BASE_DIR, "iso_extract")
APKS_DIR = os.path.join(ISO_DIR, "apks", "x86_64")

os.makedirs(APKS_DIR, exist_ok=True)

# 1. Download official Alpine APKINDEX for main and community
MIRRORS = {
    "main": "https://dl-cdn.alpinelinux.org/alpine/v3.20/main/x86_64",
    "community": "https://dl-cdn.alpinelinux.org/alpine/v3.20/community/x86_64"
}

print("Fetching APKINDEX from Alpine CDN...")
packages = {}

for repo, base_url in MIRRORS.items():
    idx_url = f"{base_url}/APKINDEX.tar.gz"
    idx_tar_path = os.path.join(BASE_DIR, f"APKINDEX_{repo}.tar.gz")
    try:
        urllib.request.urlretrieve(idx_url, idx_tar_path)
        with tarfile.open(idx_tar_path, "r:gz") as tar:
            f = tar.extractfile("APKINDEX")
            content = f.read().decode("utf-8", errors="ignore")
            
            # Parse APKINDEX
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
    except Exception as e:
        print(f"Error fetching {repo} index:", e)

print(f"Parsed {len(packages)} packages from Alpine repositories.")

# Target packages required for full desktop kiosk
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
    # Strip version constraints (e.g., so:libGL.so.1 or cmd:bash or foo>=1.0)
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

# Download all packages to apks/x86_64
for pkg_name in sorted(needed_packages):
    if pkg_name in packages:
        p_info = packages[pkg_name]
        dest_file = os.path.join(APKS_DIR, p_info["file"])
        if not os.path.exists(dest_file):
            print(f"Downloading {p_info['file']}...")
            try:
                urllib.request.urlretrieve(p_info["url"], dest_file)
            except Exception as e:
                print(f"Failed to download {p_info['file']}: {e}")

print("All APK packages downloaded successfully!")
