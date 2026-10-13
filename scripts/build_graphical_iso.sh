#!/bin/bash
set -e

WORKDIR="/home/nitanshutak/aura_live_build"
rm -rf $WORKDIR
mkdir -p $WORKDIR/chroot $WORKDIR/image/live $WORKDIR/image/isolinux $WORKDIR/image/boot/grub

echo "[1/6] Debootstrapping minimal Debian bookworm rootfs..."
debootstrap --arch=amd64 --variant=minbase bookworm $WORKDIR/chroot http://deb.debian.org/debian/

echo "[2/6] Configuring repositories and installing graphical and web stack..."
mount --bind /dev $WORKDIR/chroot/dev
mount --bind /proc $WORKDIR/chroot/proc
mount --bind /sys $WORKDIR/chroot/sys

cat << 'CHROOT_SCRIPT' | chroot $WORKDIR/chroot /bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y --no-install-recommends \
    linux-image-amd64 live-boot systemd-sysv \
    xserver-xorg-core xserver-xorg-video-vesa xserver-xorg-video-vmware xserver-xorg-video-modesetting xinit \
    x11-xserver-utils x11-utils openbox chromium python3 python3-requests curl \
    xterm psmisc sudo

# Configure autologin
mkdir -p /etc/systemd/system/getty@tty1.service.d/
cat << 'AUTOLOGIN' > /etc/systemd/system/getty@tty1.service.d/override.conf
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin root --noclear %I 38400 linux
AUTOLOGIN

# Configure auto X start on root login
cat << 'BASH_PROFILE' >> /root/.bash_profile
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
    startx
fi
BASH_PROFILE

# Configure .xinitrc
cat << 'XINITRC' > /root/.xinitrc
exec openbox-session
XINITRC

# Configure Openbox autostart for AURA-OS Server and Chromium Kiosk
mkdir -p /root/.config/openbox
cat << 'OPENBOX_AUTOSTART' > /root/.config/openbox/autostart
# Start AURA-OS Core Server
cd /aura_core && python3 server.py --host 0.0.0.0 --port 8888 > /var/log/aura.log 2>&1 &

# Wait for server to bind
sleep 3

# Launch Fullscreen Chromium Kiosk
chromium --no-sandbox --test-type --kiosk --start-maximized --disable-infobars --noerrdialogs --disable-session-crashed-bubble --disable-features=TranslateUI --check-for-update-interval=31536000 http://localhost:8888 &
OPENBOX_AUTOSTART

echo "root:NTAK715" | chpasswd
echo "NitanshuOS" > /etc/hostname

apt-get clean
rm -rf /var/lib/apt/lists/*
CHROOT_SCRIPT

echo "[3/6] Embedding aura_core source into rootfs..."
mkdir -p $WORKDIR/chroot/aura_core
cp -r /mnt/d/AURA-OS/aura_core/* $WORKDIR/chroot/aura_core/

# Copy kernel and initrd to image
cp $WORKDIR/chroot/boot/vmlinuz-* $WORKDIR/image/live/vmlinuz
cp $WORKDIR/chroot/boot/initrd.img-* $WORKDIR/image/live/initrd

echo "[4/6] Cleaning and unmounting chroot..."
umount -l $WORKDIR/chroot/dev
umount -l $WORKDIR/chroot/proc
umount -l $WORKDIR/chroot/sys

echo "[5/6] Creating SquashFS compressed root..."
mksquashfs $WORKDIR/chroot $WORKDIR/image/live/filesystem.squashfs -comp xz

echo "[6/6] Creating Bootable Hybrid ISO..."
cp /usr/lib/ISOLINUX/isolinux.bin $WORKDIR/image/isolinux/
cp /usr/lib/syslinux/modules/bios/* $WORKDIR/image/isolinux/ 2>/dev/null || true

cat << 'ISOLINUX_CFG' > $WORKDIR/image/isolinux/isolinux.cfg
UI menu.c32
PROMPT 0
TIMEOUT 10
DEFAULT auraos

LABEL auraos
  MENU LABEL AURA-OS Desktop (Direct Graphical Kiosk)
  LINUX /live/vmlinuz
  INITRD /live/initrd
  APPEND boot=live quiet splash
ISOLINUX_CFG

xorriso -as mkisofs \
  -iso-level 3 \
  -full-iso-debug \
  -volid "AURAOS" \
  -isohybrid-mbr /usr/lib/ISOLINUX/isohdpfx.bin \
  -eltorito-boot isolinux/isolinux.bin \
  -eltorito-catalog isolinux/boot.cat \
  -no-emul-boot -boot-load-size 4 -boot-info-table \
  -isohybrid-gpt-basdat \
  -output /mnt/d/AURA-OS/NitanshuOS/output/images/auraos-live.iso \
  $WORKDIR/image

echo "SUCCESS: Generated bootable graphical ISO at /mnt/d/AURA-OS/NitanshuOS/output/images/auraos-live.iso"
