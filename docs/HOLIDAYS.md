Takwim Perancang disimpan dalam `src/holidays.js` supaya penandaan hari cuti berfungsi tanpa sambungan rangkaian. Data tidak menghasilkan rekod tugasan/acara/peringatan.

Sumber rasmi yang disemak pada 10 November 2026:

- [Jadual Hari Kelepasan Am 2026, BKPP JPM](https://www.kabinet.gov.my/storage/2025/08/HKA-2026.pdf).
- [Jadual Hari Kelepasan Am 2027, BKPP JPM](https://www.kabinet.gov.my/storage/2026/08/HKA_2027.pdf).
- [Warta P.U. (B) 111/2026](https://www.kabinet.gov.my/storage/2026/03/PUB-111_2026.pdf), cuti tambahan Hari Raya di Semenanjung. Oleh sebab Hari Raya dalam jadual ialah 21 Mac, 20 Mac turut dimasukkan.
- [Penjelasan BKPP JPM](https://www.kabinet.gov.my/), cuti gantian Wesak 2026 pada 2 Jun, selepas cuti Yang di-Pertuan Agong pada 1 Jun.
- [Pekeliling SUK Kelantan 2026, 27 November 2025](https://secure.kelantan.gov.my/images/Pekeliling/kelepasanAm/HariKelepasanAMKerajaanNegeriBagiTahun2026.pdf), rujukan SUK.(S)D200/472/43(3), khususnya peraturan gantian di halaman 3.

Pilihan awal ialah Kelantan, mengikut permintaan pengguna. Kalendar ini merangkumi Hari Wukuf, hari kedua Qurban, Nuzul Al-Quran dan kedua-dua hari keputeraan Sultan Kelantan. Tahun Baharu dan Thaipusam tidak dimasukkan untuk Kelantan. Pilihan Selangor dan Kuala Lumpur menambah cuti negeri masing-masing pada cuti persekutuan. Ini bukan kalendar semua negeri; negeri lain memerlukan jadual dan peraturan gantian berkenaan, termasuk pengecualian cuti persekutuan.

Mengikut pekeliling SUK Kelantan pada halaman 3, cuti pada Jumaat tidak mempunyai gantian berasingan; cuti pada Sabtu diganti pada hari berikutnya yang belum menjadi cuti umum. Jika cuti berturut-turut pada Jumaat dan Sabtu, satu hari gantian sahaja diberikan. Ahad bukan hari pencetus gantian bagi Kelantan. Peraturan ini turut digunakan untuk jadual 2027 sehingga terdapat pindaan rasmi.

Pilihan Persekutuan, Selangor dan Kuala Lumpur menggunakan gantian Ahad; pertindihan dua nama cuti pada hari Ahad berkongsi satu hari gantian. Sabtu tidak diganti secara automatik untuk pilihan tersebut. Pilihan negeri hanya disimpan dalam localStorage pelayar, berasingan daripada data ruang kerja.

Apabila jadual tahun baharu atau pindaan diwartakan, kemas kini `federal`, `stateDates` dan `holidayYears`, kemudian semak ujian cuti gantian. Jangan ulang tarikh perayaan bergerak pada tahun lain. Tahun yang belum mempunyai data masih menandakan Jumaat dan memaparkan makluman bahawa cuti umum belum tersedia.
