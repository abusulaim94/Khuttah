**KHUTTAH — Ruang kerja peribadi**

Tugasan, acara, peringatan, nota dan karya peribadi.

Versi ini menggunakan JavaScript dan CSS dengan Vite untuk pembangunan serta build. Ruang kerja dilindungi oleh log masuk Supabase Auth dan diselaraskan secara automatik antara telefon serta komputer melalui pangkalan data awan (`public.khuttah_workspaces`), di samping simpanan setempat dan draf dalam pelayar.

Pemasangan baharu bermula tanpa tugasan, acara, peringatan, projek, nota atau tag contoh. Kumpulan Peribadi, Uthmani dan KPAZ dikekalkan sebagai struktur awal. Data demo lama yang masih asal dibersihkan sekali; rekod yang telah diubah, data ciptaan pengguna dan rekod yang mempunyai draf dikekalkan. Salinan data tersimpan sebelum pembersihan dikekalkan dalam pelayar apabila ruang storan membenarkan.

**Mula di komputer ini**

Gunakan Node.js 24. Buka terminal PowerShell dalam folder projek:

```powershell
npm.cmd ci
npm.cmd run dev
```

Buka `http://127.0.0.1:5173/`. Kekalkan alamat yang sama semasa pembangunan kerana storan pelayar berasingan mengikut alamat, protokol dan port.

```powershell
npm.cmd test
npm.cmd run test:browser
npm.cmd run build
npm.cmd run preview
```

Build pengeluaran berada dalam `dist/`; pratonton build menggunakan `http://127.0.0.1:4173/`. Pratonton mempunyai storan pelayar berasingan daripada pelayan pembangunan. Gunakan eksport/import untuk memindahkan data. [Panduan deployment Vite](https://vite.dev/guide/static-deploy) menerangkan konfigurasi hosting bagi hasil build ini.

Ujian pelayar menggunakan Chrome yang dipasang pada Windows. Pada Linux, jalankan `npx playwright install chromium` dahulu. Ujian menggunakan sesi dan data Supabase tiruan dalam profil berasingan; ia tidak menulis ke akaun sebenar.

**Memindahkan data daripada HTML lama**

1. Buka `KHUTTAH_Prototype.html` melalui lokasi fail yang biasa digunakan.
2. Pilih ikon Tetapan di sebelah profil → Umum → Eksport untuk web app.
3. Buka web app baharu melalui alamat pembangunan atau hosting.
4. Pilih Tetapan → Umum → Import sandaran.
5. Semak bilangan rekod, nota dan kumpulan, kemudian sahkan penggantian data.

Import menggantikan data dan draf pada alamat web yang sedang dibuka. Eksport data semasa dahulu jika perlu mengekalkannya. Sandaran merangkumi rekod, nota, projek, kumpulan, subfolder dan tag yang telah disimpan; draf disimpan berasingan dalam pelayar.

Fail prototaip dikekalkan untuk rujukan dan eksport data lama. Perubahan baharu dibuat pada `src/` dan `index.html`.

**Fungsi semasa**

- Ringkasan semua kumpulan, dengan tugasan tertunggak serta tarikh tugasan, acara dan peringatan dalam tujuh hari akan datang. Acara lama tidak dianggap tertunggak; acara berulang menggunakan kemunculan seterusnya.
- Perancang Bulan, Minggu dan Hari. Klik ruang kosong atau butang `+` pada tarikh untuk menambah tugasan, acara atau peringatan dengan tarikh siap diisi.
- Tugasan boleh disimpan tanpa tarikh, ditapis secara berasingan, kemudian diberikan tarikh atau ditunda.
- Nota dalam menu utama, dengan tajuk, bold, italic, underline, senarai, checklist, petikan dan undo/redo. Format disimpan bersama teks biasa dan boleh dipulihkan daripada draf atau sandaran.
- Tag boleh ditambah semasa menulis, dinamakan semula dan dipadam. Suntingan tag turut mengemas kini catatan dan draf berkaitan.
- Idea rambang mempunyai menu tersendiri untuk catatan bebas, berasingan daripada Karya.
- Karya Abu Sulaim mempunyai folder Sudah diterbitkan dan Belum diterbitkan. Empat buku diterbitkan disediakan: Nota Mudah Makhraj & Sifat Huruf, Kesimpulan Makhraj & Sifat Huruf, Tajwid al-Nasyr dan Akhlaq Hamalat al-Quran.
- Setiap buku mempunyai papan sticky notes untuk pembetulan, idea cetakan seterusnya, idea buku dan catatan. Nota pantas boleh disimpan tanpa tajuk atau buku dalam Belum ditetapkan, kemudian diseret atau dipindahkan melalui pilihan Pindah. Pemegang seret menyokong sentuhan tablet.
- Buku boleh dikelaskan dalam lebih daripada satu bidang. Bidang awal ialah Tajwid, Akhlak, Terjemahan dan Sirah; nama bidang boleh ditambah, disunting dan dipadam. Status penerbitan boleh diubah tanpa memisahkan nota daripada buku.
- Nota Karya lama kekal sebagai nota belum ditetapkan. Memadam folder buku memindahkan catatannya ke Belum ditetapkan dan menyediakan Buat asal; koleksi yang sengaja dikosongkan tidak diisi semula secara automatik.
- Susunan A–Z, Z–A dan tarikh pada senarai. Nota menggunakan tarikh kemas kini; nota lama tanpa metadata tarikh diletakkan selepas nota yang mempunyai tarikh.
- Penapis kumpulan disimpan mengikut halaman. Menu kumpulan membuka halaman kumpulan; Ringkasan sentiasa merangkumi semua kumpulan.
- Paparan tablet landscape menggunakan bar sisi dan ruang kandungan lebar; telefon serta tablet portrait menggunakan navigasi bawah.
- Draf automatik untuk nota dan borang rekod, termasuk pemulihan selepas carian atau muat semula.
- Halaman Peribadi, Uthmani dan KPAZ yang menghimpunkan tugasan, acara 30 hari akan datang, deadline serta nota.
- Buat asal pemadaman rekod atau nota melalui mesej selama 12 saat, sehingga mesej tindakan seterusnya.
- Eksport/import JSON dengan pratonton, pengesahan struktur data dan pengesahan pengguna.
- Pemulihan data tersimpan yang tidak sah tanpa menindih salinan asal secara automatik.
- Bacaan & Kajian, Master dan PhD di bawah Ilmu dan Pengetahuan. Pilihan Projek telah dikeluarkan daripada Tetapan; rekod projek lama kekal dalam sandaran.
- Skrin log masuk terlindung dan penyelarasan awan automatik antara peranti melalui Supabase Auth + Postgres RLS.

**Struktur projek**

```text
index.html                     Halaman masuk web app
src/app.js                     Antaramuka dan aliran aplikasi
src/styles.css                 Reka bentuk dan paparan responsif
src/storage.js                 Format, pengesahan dan sandaran data
src/drafts.js                  Penyimpanan serta pemulihan draf borang
src/editor.js                  Editor nota Tiptap dan sanitasi HTML
src/workspace.js               Tag, sorting, deadline dan kategori karya
src/book-drag.js               Seret nota ke buku dengan tetikus atau sentuhan
src/cleanup.js                 Pembersihan sekali bagi data demo lama
src/supabase.js                Pengesahan log masuk dan penyelarasan awan Supabase
supabase/schema.sql            Skema jadual dan polisi RLS Postgres untuk Supabase
tests/storage.test.js          Ujian sandaran, data lama dan data tidak sah
tests/cleanup.test.js          Ujian pembersihan demo dan perlindungan data pengguna
tests/supabase.test.js         Ujian log masuk, pembaharuan sesi dan penyelarasan awan
tests/workspace.test.js        Ujian tugasan tanpa tarikh, nota berformat, tag dan deadline
tests/books.test.js            Ujian migrasi buku, bidang, pindah nota dan sandaran
tests/browser/workspace.spec.js Ujian aliran pengguna dan paparan 320–1440 piksel
public/favicon.svg            Ikon aplikasi
.github/workflows/check.yml   Ujian, build dan penerbitan GitHub Pages
KHUTTAH_Prototype.html         Prototaip lama dan alat eksport data
LAPORAN_SEMAKAN_HTML.md        Laporan sejarah bagi versi sebelum web app
```

**GitHub dan penerbitan**

Repositori sasaran: [abusulaim94/Khuttah](https://github.com/abusulaim94/Khuttah).

Auto-push selepas commit pada `main`, tetapan identiti `abusulaim94` dan cara mengurus akaun lama diterangkan dalam [panduan GitHub](docs/GITHUB.md). Aktifkan pada komputer ini dengan `npm.cmd run github:setup`, kemudian log masuk akaun yang betul melalui Git Credential Manager.

Push ke `main` menjalankan ujian dan build, kemudian menerbitkan hasil ke [KHUTTAH](https://abusulaim94.github.io/Khuttah/) melalui GitHub Pages. Penyelarasan data pengguna menggunakan Supabase; perubahan yang dibuat ketika permintaan awan sedang berjalan dihantar semula selepas permintaan itu selesai. Draf kekal dalam pelayar masing-masing.
