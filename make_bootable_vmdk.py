import subprocess
import os
import shutil

print("Creating bootable disk image...")
subprocess.run("sudo rm -rf /tmp/auraos_mount /tmp/auraos-disk.raw", shell=True)

# 1. Create 512MB raw disk
subprocess.run("dd if=/dev/zero of=/tmp/auraos-disk.raw bs=1M count=512", shell=True, check=True)

# 2. Partition with MBR and boot flag
subprocess.run("parted -s /tmp/auraos-disk.raw mklabel msdos mkpart primary ext4 1MiB 100% set 1 boot on", shell=True, check=True)

# 3. Setup loop device
loop_out = subprocess.check_output("sudo losetup -Pf --show /tmp/auraos-disk.raw", shell=True).decode().strip()
print(f"Loop device: {loop_out}")
loop_part = f"{loop_out}p1"

try:
    # 4. Format ext4
    subprocess.run(f"sudo mkfs.ext4 -F -L 'AURA_ROOT' {loop_part}", shell=True, check=True)

    # 5. Mount and copy rootfs
    os.makedirs("/tmp/auraos_mount", exist_ok=True)
    subprocess.run(f"sudo mount {loop_part} /tmp/auraos_mount", shell=True, check=True)

    # Extract rootfs.tar
    print("Extracting rootfs.tar...")
    subprocess.run("sudo tar -xf /home/nitanshutak/auraos-build/buildroot/output/images/rootfs.tar -C /tmp/auraos_mount", shell=True, check=True)

    # Copy kernel to /boot
    subprocess.run("sudo mkdir -p /tmp/auraos_mount/boot/grub", shell=True, check=True)
    subprocess.run("sudo cp /home/nitanshutak/auraos-build/buildroot/output/images/bzImage /tmp/auraos_mount/boot/", shell=True, check=True)

    # Write grub.cfg
    grub_cfg = """set default=0
set timeout=1

menuentry "AURA-OS" {
    linux /boot/bzImage root=/dev/sda1 rw console=tty0 console=ttyS0
}
"""
    subprocess.run(f"sudo tee /tmp/auraos_mount/boot/grub/grub.cfg << 'EOF'\n{grub_cfg}\nEOF", shell=True, check=True)

    # 6. Install GRUB to MBR of the disk
    print("Installing GRUB to MBR...")
    subprocess.run(f"sudo grub-install --target=i386-pc --boot-directory=/tmp/auraos_mount/boot {loop_out}", shell=True, check=True)

finally:
    print("Cleaning up mounts...")
    subprocess.run("sudo umount /tmp/auraos_mount || true", shell=True)
    subprocess.run(f"sudo losetup -d {loop_out} || true", shell=True)

# 7. Convert raw disk to VMDK
print("Converting to VMDK...")
subprocess.run("qemu-img convert -f raw -O vmdk /tmp/auraos-disk.raw /mnt/d/AURA-OS/NitanshuOS/output/images/nitanshuos-remastered.vmdk", shell=True, check=True)
print("SUCCESS: Bootable VMDK created at /mnt/d/AURA-OS/NitanshuOS/output/images/nitanshuos-remastered.vmdk")
