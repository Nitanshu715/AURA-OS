# PowerShell script to create and configure AURA-OS VM in VirtualBox automatically

$vboxPath = "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"
if (-not (Test-Path $vboxPath)) {
    Write-Host "[ERROR] VirtualBox not found at $vboxPath. Please ensure Oracle VM VirtualBox is installed." -ForegroundColor Red
    exit 1
}

$vmName = "AURA-OS"
$vmdkPath = "D:\AURA-OS\NitanshuOS\output\images\nitanshuos-remastered.vmdk"
$sharedFolderPath = "D:\AURA-OS\aura_core"

Write-Host "=== Setting up $vmName in VirtualBox ===" -ForegroundColor Cyan

# 1. Check if VM already exists and unregister if needed
$existing = & $vboxPath list vms
if ($existing -match $vmName) {
    Write-Host "Unregistering existing $vmName VM..." -ForegroundColor Yellow
    & $vboxPath unregistervm $vmName --delete
}

# 2. Create the VM
Write-Host "1. Creating VM..." -ForegroundColor Green
& $vboxPath createvm --name $vmName --ostype "Linux_64" --register

# 3. Configure Hardware Specifications
Write-Host "2. Configuring CPU (2 Cores) and RAM (2048 MB)..." -ForegroundColor Green
& $vboxPath modifyvm $vmName --memory 2048 --cpus 2 --vram 64 --graphicscontroller vmsvga --boot1 disk --boot2 none --boot3 none --boot4 none

# 4. Configure Storage Controller & Attach VMDK Disk
Write-Host "3. Attaching AURA-OS Kernel/Rootfs Disk ($vmdkPath)..." -ForegroundColor Green
& $vboxPath storagectl $vmName --name "SATA Controller" --add sata --controller IntelAHCI --portcount 2
& $vboxPath storageattach $vmName --storagectl "SATA Controller" --port 0 --device 0 --type hdd --medium $vmdkPath

# 5. Configure Network & Port Forwarding (8888 for Web Desktop, 2222 for SSH, 11434 for AI)
Write-Host "4. Setting up Network & Port Forwarding..." -ForegroundColor Green
& $vboxPath modifyvm $vmName --nic1 nat
& $vboxPath modifyvm $vmName --natpf1 "AURA-Web,tcp,127.0.0.1,8888,,8888"
& $vboxPath modifyvm $vmName --natpf1 "AURA-SSH,tcp,127.0.0.1,2222,,22"
& $vboxPath modifyvm $vmName --natpf1 "AURA-AI,tcp,127.0.0.1,11434,,11434"

# 6. Configure Two-Way Shared Folder for Live Code Sync
Write-Host "5. Setting up Live Code Sync Shared Folder ($sharedFolderPath)..." -ForegroundColor Green
& $vboxPath sharedfolder add $vmName --name "aura_core" --hostpath $sharedFolderPath --automount --mountpoint "/media/sf_aura_core"

Write-Host "`n=== AURA-OS VIRTUALBOX VM CONFIGURED SUCCESSFULLY ===" -ForegroundColor Cyan
Write-Host "You can now start the VM from the VirtualBox GUI or run:" -ForegroundColor White
Write-Host "  & `"$vboxPath`" startvm `"$vmName`"" -ForegroundColor Yellow
