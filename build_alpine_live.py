import os
import shutil
import subprocess
import urllib.request
import tarfile
import io

OUTPUT_DIR = r"D:\AURA-OS\NitanshuOS\output\images"
ISO_DEST = os.path.join(OUTPUT_DIR, "auraos-live.iso")
CACHE_ISO = r"D:\AURA-OS\NitanshuOS\output\images\alpine-standard.iso"

ALPINE_ISO_URL = "https://dl-cdn.alpinelinux.org/alpine/v3.20/releases/x86_64/alpine-standard-3.20.3-x86_64.iso"

print("1. Downloading / caching Alpine base ISO...")
if not os.path.exists(CACHE_ISO) or os.path.getsize(CACHE_ISO) < 100_000_000:
    print(f"Downloading {ALPINE_ISO_URL}...")
    urllib.request.urlretrieve(ALPINE_ISO_URL, CACHE_ISO)
    print("Download complete.")

print("2. Creating custom AURA-OS apkovl overlay...")
apkovl_buf = io.BytesIO()
with tarfile.open(fileobj=apkovl_buf, mode="w:gz") as tar:
    # 1. /etc/inittab with auto-login on tty1
    inittab = """::sysinit:/sbin/openrc sysinit
::sysinit:/sbin/openrc boot
::wait:/sbin/openrc default

# Auto login root on tty1
tty1::respawn:/sbin/getty -n -l /bin/sh 38400 tty1
tty2::respawn:/sbin/getty 38400 tty2

::ctrlaltdel:/sbin/reboot
::shutdown:/sbin/openrc shutdown
"""
    tinfo = tarfile.TarInfo(name="etc/inittab")
    tinfo.size = len(inittab.encode())
    tinfo.mode = 0o644
    tar.addfile(tinfo, io.BytesIO(inittab.encode()))

    # 2. /etc/hostname
    hostname = "AURA-OS\n"
    tinfo = tarfile.TarInfo(name="etc/hostname")
    tinfo.size = len(hostname.encode())
    tinfo.mode = 0o644
    tar.addfile(tinfo, io.BytesIO(hostname.encode()))

    # 3. /etc/apk/world (packages to activate)
    apk_world = "alpine-base\npython3\npy3-requests\npy3-pip\nxorg-server\nxf86-video-vmware\nxf86-video-vesa\nxf86-video-modesetting\nxf86-input-libinput\nopenbox\nchromium\nxterm\ncurl\n"
    tinfo = tarfile.TarInfo(name="etc/apk/world")
    tinfo.size = len(apk_world.encode())
    tinfo.mode = 0o644
    tar.addfile(tinfo, io.BytesIO(apk_world.encode()))

    # 4. /etc/local.d/aura.start (Startup script)
    local_start = """#!/bin/sh
# Start networking
ifup -a 2>/dev/null || true

# Start AURA-OS Core Backend
cd /aura_core
python3 server.py --host 0.0.0.0 --port 8888 > /var/log/aura.log 2>&1 &

# Auto launch X and Kiosk
if [ ! -f /tmp/.x_started ]; then
    touch /tmp/.x_started
    startx -- -nocursor > /var/log/xorg.log 2>&1 &
fi
"""
    tinfo = tarfile.TarInfo(name="etc/local.d/aura.start")
    tinfo.size = len(local_start.encode())
    tinfo.mode = 0o755
    tar.addfile(tinfo, io.BytesIO(local_start.encode()))

    # 5. /root/.xinitrc (Launch Openbox & Chromium Kiosk)
    xinitrc = """#!/bin/sh
# Openbox window manager
openbox &

# Wait for server
sleep 2

# Fullscreen Chromium
chromium --no-sandbox --test-type --kiosk --start-maximized --disable-infobars --noerrdialogs --disable-session-crashed-bubble http://localhost:8888
"""
    tinfo = tarfile.TarInfo(name="root/.xinitrc")
    tinfo.size = len(xinitrc.encode())
    tinfo.mode = 0o755
    tar.addfile(tinfo, io.BytesIO(xinitrc.encode()))

    # 6. Enable local service in default runlevel
    tinfo = tarfile.TarInfo(name="etc/runlevels/default/local")
    tinfo.type = tarfile.SYMTYPE
    tinfo.linkname = "/etc/init.d/local"
    tar.addfile(tinfo)

    # 7. Add aura_core
    tar.add(r"D:\AURA-OS\aura_core", arcname="aura_core")

apkovl_buf.seek(0)
apkovl_bytes = apkovl_buf.getvalue()

apkovl_path = os.path.join(OUTPUT_DIR, "AURA-OS.apkovl.tar.gz")
with open(apkovl_path, "wb") as f:
    f.write(apkovl_bytes)
print(f"3. Created apkovl overlay at {apkovl_path} ({len(apkovl_bytes)} bytes)")

print("4. Repackaging ISO with AURA-OS apkovl overlay...")
wsl_cmd = f"""
mkdir -p /tmp/iso_extract /tmp/iso_repack
rm -rf /tmp/iso_extract/* /tmp/iso_repack/*
osirrox -indev /mnt/d/AURA-OS/NitanshuOS/output/images/alpine-standard.iso -extract / /tmp/iso_extract
cp /mnt/d/AURA-OS/NitanshuOS/output/images/AURA-OS.apkovl.tar.gz /tmp/iso_extract/AURA-OS.apkovl.tar.gz
cp /mnt/d/AURA-OS/NitanshuOS/output/images/AURA-OS.apkovl.tar.gz /tmp/iso_extract/localhost.apkovl.tar.gz

# Set instant boot in syslinux
if [ -f /tmp/iso_extract/boot/syslinux/syslinux.cfg ]; then
    sed -i 's/TIMEOUT .*/TIMEOUT 1/' /tmp/iso_extract/boot/syslinux/syslinux.cfg
    sed -i 's/DEFAULT .*/DEFAULT lts/' /tmp/iso_extract/boot/syslinux/syslinux.cfg
fi
if [ -f /tmp/iso_extract/boot/syslinux/isolinux.cfg ]; then
    sed -i 's/TIMEOUT .*/TIMEOUT 1/' /tmp/iso_extract/boot/syslinux/isolinux.cfg
fi

# Repack ISO
xorriso -as mkisofs -r -V "AURA_LIVE" \
  -J -joliet-long \
  -b boot/syslinux/isolinux.bin \
  -c boot/syslinux/boot.cat \
  -no-emul-boot -boot-load-size 4 -boot-info-table \
  -o /mnt/d/AURA-OS/NitanshuOS/output/images/auraos-live.iso \
  /tmp/iso_extract
"""
subprocess.run(["wsl", "-d", "Ubuntu", "-u", "root", "-e", "bash", "-c", wsl_cmd], check=True)
print(f"SUCCESS: Generated live graphical AURA-OS ISO at {ISO_DEST}")
