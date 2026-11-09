**GitHub KHUTTAH**

Repositori: [abusulaim94/Khuttah](https://github.com/abusulaim94/Khuttah). Akaun untuk commit dan push projek ini ialah `abusulaim94`.

**Aktifkan auto-push pada komputer ini**

Dalam folder utama projek:

```powershell
npm.cmd run github:setup
git credential-manager github login --username abusulaim94 --device
```

Semasa pengesahan GitHub, pastikan akaun yang dipilih ialah `abusulaim94`. Kata laluan atau token tidak perlu disimpan dalam fail projek.

Selepas log masuk, setiap `git commit` pada `main` akan terus cuba push ke `origin/main`. Menyimpan fail sahaja belum menghasilkan commit. Branch lain tidak dipush secara automatik. Jika sambungan terputus atau push ditolak, commit kekal setempat; semak puncanya dan cuba `git push origin main` semula. Hook tidak melakukan pull, merge atau force-push.

Tetapan identiti dan hook hanya digunakan dalam repositori ini. Jalankan pemasangan sekali lagi selepas clone ke komputer lain. Auto-push tidak dipasang melalui `npm install`.

Untuk mematikan auto-push:

```powershell
git config --local khuttah.autoPush false
```

Untuk satu commit tanpa auto-push dalam PowerShell:

```powershell
$env:KHUTTAH_AUTO_PUSH = '0'
git commit -m "Mesej commit"
Remove-Item Env:KHUTTAH_AUTO_PUSH
```

**Mengapa abusulaimmadani muncul sebagai contributor**

Semakan pada 10 November 2026 mendapati keenam-enam commit asal dalam `main` dikaitkan oleh GitHub dengan `abusulaimmadani`. Tiga commit menggunakan `abusulaimmadani@gmail.com` dan tiga lagi menggunakan `abusulaimmadani@users.noreply.github.com`. Remote sudah menuju `abusulaim94/Khuttah`, tetapi identiti Git global masih menggunakan e-mel akaun lama.

Identiti setempat baharu ialah `Abu Sulaim <341015427+abusulaim94@users.noreply.github.com>`. Menukar identiti hanya membetulkan commit akan datang. GitHub mengaitkan author berdasarkan e-mel dalam commit; pemilik repositori dan akaun yang menolak kod boleh berbeza daripada author.

**Buang log masuk akaun lama daripada komputer**

Jika akaun lama tidak lagi digunakan untuk projek lain:

```powershell
git credential-manager github logout abusulaimmadani
git credential-manager github list
```

Arahan logout membuang kelayakan Git akaun itu pada komputer ini dan boleh memerlukan log masuk semula untuk repositori lain yang menggunakannya. Dalam VS Code, akaun pada menu Accounts di penjuru bawah juga mempunyai sesi berasingan; gunakan Sign Out pada `abusulaimmadani` jika masih tertera, kemudian Sign In sebagai `abusulaim94`.

**Buang contributor lama daripada sejarah GitHub**

Logout atau membuang collaborator tidak memadam attribution sejarah. Untuk memindahkan keenam-enam commit kepada `abusulaim94`, author dan committer lama perlu ditukar dalam salinan repositori, kemudian sejarah `main` yang baharu perlu dihantar dengan `--force-with-lease`.

Urutan kerja:

1. Pastikan log masuk `abusulaim94` mempunyai akses push dan semua perubahan semasa sudah disimpan.
2. Buat sandaran `git bundle` bagi semua ref di luar folder kerja yang akan ditulis semula, dan semak sandaran itu dengan `git bundle verify`.
3. Catat SHA `origin/main` semasa. Gunakan clone baharu berasingan untuk menulis semula sejarah; clone baharu belum mempunyai hook auto-push yang aktif.
4. Gunakan `git filter-repo --mailmap` untuk memetakan kedua-dua e-mel lama kepada `Abu Sulaim <341015427+abusulaim94@users.noreply.github.com>` pada author dan committer. Fail pemetaan ialah dua baris dalam format `Nama Baharu <e-mel-baharu> <e-mel-lama>`.
5. Semak keenam-enam commit dan pastikan kandungan fail pada commit akhir sama dengan versi sebelum penulisan semula.
6. Push `main` menggunakan `--force-with-lease=refs/heads/main:SHA_LAMA` supaya perubahan orang lain yang masuk kemudian tidak ditindih. Semak sekatan branch dan keadaan GitHub Actions/Pages dahulu.
7. Selaraskan clone kerja dengan sejarah baharu selepas mengekalkan perubahan setempat. SHA commit lama telah berubah; clone lama tidak boleh terus dicampurkan melalui pull biasa.

Penulisan semula sejarah telah diselesaikan pada 10 November 2026: enam commit lama dibetulkan dan semua tujuh commit ketika itu dikaitkan dengan `abusulaim94`. Kandungan fail, mesej dan tarikh commit dikekalkan. Sandaran bundle setempat berada dalam `backups/github-history-20261110012927-MYT/`. Paparan contributor GitHub boleh mengambil kira-kira 24 jam untuk dikemas kini selepas sejarah diubah. Jika masih salah selepas itu, hubungi GitHub Support.

Jika `abusulaimmadani` juga mempunyai akses sebagai collaborator, pemilik repositori boleh membuangnya melalui **Settings → Collaborators → Remove access**. Akses collaborator dan senarai Contributors ialah dua perkara berasingan.

Rujukan: [identiti commit](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address), [format e-mel noreply](https://docs.github.com/en/account-and-profile/reference/email-addresses-reference), [paparan contributor](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-a-projects-contributors), [Git Credential Manager](https://github.com/git-ecosystem/git-credential-manager/blob/main/docs/usage.md).
