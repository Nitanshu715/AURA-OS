import subprocess
import os
import shutil

os.environ['PATH'] = '/home/nitanshutak/auraos-build/buildroot/output/host/bin:' + os.environ.get('PATH', '')
os.makedirs('/tmp/aura_iso/boot/grub', exist_ok=True)
shutil.copy('/home/nitanshutak/auraos-build/buildroot/output/images/bzImage', '/tmp/aura_iso/boot/bzImage')
shutil.copy('/home/nitanshutak/auraos-build/buildroot/output/images/rootfs.cpio', '/tmp/aura_iso/boot/rootfs.cpio')

grub_cfg = """set default=0
set timeout=1

menuentry "AURA-OS" {
    linux /boot/bzImage console=tty0 rw
    initrd /boot/rootfs.cpio
}
"""

with open('/tmp/aura_iso/boot/grub/grub.cfg', 'w') as f:
    f.write(grub_cfg)

cmd = ['grub-mkrescue', '--xorriso=/home/nitanshutak/auraos-build/buildroot/output/host/bin/xorriso', '-o', '/tmp/auraos-live.iso', '/tmp/aura_iso']
print("Running grub-mkrescue...")
subprocess.run(cmd, check=True)
shutil.copy('/tmp/auraos-live.iso', '/mnt/d/AURA-OS/NitanshuOS/output/images/auraos-live.iso')
print("ISO GENERATED SUCCESSFULLY: /mnt/d/AURA-OS/NitanshuOS/output/images/auraos-live.iso")
