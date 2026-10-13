#!/bin/bash
set -e

BUILD_DIR="/home/nitanshutak/auraos_turnkey_build"
ISO_OUT="/mnt/d/AURA-OS/NitanshuOS/output/images/AURA-OS-v2.0-Desktop.iso"
export TMPDIR="/home/nitanshutak/tmp"
mkdir -p "$TMPDIR"

echo "=== [1/5] Preparing build workspace ==="
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/chroot" "$BUILD_DIR/image/live" "$BUILD_DIR/image/isolinux"

echo "=== [2/5] Bootstrapping system with mmdebstrap and all packages ==="
mmdebstrap \
  --arch=amd64 \
  --variant=minbase \
  --include=linux-image-amd64,live-boot,systemd-sysv,xserver-xorg-core,xserver-xorg-video-all,xinit,openbox,chromium,python3,python3-requests,curl,xterm,psmisc,sudo,libgl1-mesa-dri,ca-certificates \
  --keyring=/usr/share/keyrings/debian-archive-keyring.gpg \
  bookworm \
  "$BUILD_DIR/chroot" \
  http://deb.debian.org/debian/

echo "=== [3/5] Configuring Autologin, Desktop & Kiosk autostart ==="
cat << 'EOF' | chroot "$BUILD_DIR/chroot" /bin/bash
set -e

# Configure root autologin on tty1
mkdir -p /etc/systemd/system/getty@tty1.service.d/
cat << 'AUTOLOGIN' > /etc/systemd/system/getty@tty1.service.d/override.conf
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin root --noclear %I 38400 linux
AUTOLOGIN

# Auto startx on root login
cat << 'BASH_PROFILE' >> /root/.bash_profile
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
    startx
fi
BASH_PROFILE

# Configure Openbox autostart
mkdir -p /root/.config/openbox
cat << 'OPENBOX' > /root/.config/openbox/autostart
# Start AURA-OS Server
cd /aura_core && python3 server.py --host 0.0.0.0 --port 8888 > /var/log/aura.log 2>&1 &

# Brief pause to ensure port 8888 is active
sleep 3

# Launch Fullscreen Chromium Kiosk
chromium --no-sandbox --test-type --kiosk --start-maximized --disable-infobars --noerrdialogs --disable-session-crashed-bubble http://localhost:8888 &
OPENBOX

cat << 'XINIT' > /root/.xinitrc
exec openbox-session
XINIT

echo "root:NTAK715" | chpasswd
echo "AURA-OS" > /etc/hostname
echo "127.0.0.1 localhost AURA-OS" > /etc/hosts
EOF

echo "=== [4/5] Embedding AURA-OS Core & Kernel ==="
mkdir -p "$BUILD_DIR/chroot/aura_core"
cp -r /mnt/d/AURA-OS/aura_core/* "$BUILD_DIR/chroot/aura_core/"

cp "$BUILD_DIR"/chroot/boot/vmlinuz-* "$BUILD_DIR/image/live/vmlinuz"
cp "$BUILD_DIR"/chroot/boot/initrd.img-* "$BUILD_DIR/image/live/initrd"

echo "=== [5/5] Generating Live SquashFS and Hybrid Desktop ISO ==="
mksquashfs "$BUILD_DIR/chroot" "$BUILD_DIR/image/live/filesystem.squashfs" -comp xz -e boot

cp /usr/lib/ISOLINUX/isolinux.bin "$BUILD_DIR/image/isolinux/"
cp /usr/lib/syslinux/modules/bios/* "$BUILD_DIR/image/isolinux/" 2>/dev/null || true

cat << 'EOF' > "$BUILD_DIR/image/isolinux/isolinux.cfg"
UI menu.c32
PROMPT 0
TIMEOUT 10
DEFAULT auraos

LABEL auraos
  MENU LABEL AURA-OS Turnkey Desktop (Graphical Kiosk)
  LINUX /live/vmlinuz
  INITRD /live/initrd
  APPEND boot=live quiet splash
EOF

mkdir -p "$(dirname "$ISO_OUT")"

xorriso -as mkisofs \
  -iso-level 3 \
  -full-iso-debug \
  -volid "AURAOS" \
  -isohybrid-mbr /usr/lib/ISOLINUX/isohdpfx.bin \
  -eltorito-boot isolinux/isolinux.bin \
  -eltorito-catalog isolinux/boot.cat \
  -no-emul-boot -boot-load-size 4 -boot-info-table \
  -isohybrid-gpt-basdat \
  -output "$ISO_OUT" \
  "$BUILD_DIR/image"

echo "SUCCESS: Standalone Graphical ISO created at: $ISO_OUT"
