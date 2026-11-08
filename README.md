**KHUTTAH — Ruang kerja peribadi**

Tugasan, acara, deadline, bacaan, nota dan penyelidikan dalam satu ruang kerja. Reka bentuk serta susunan menu dikekalkan daripada prototaip HTML.

Versi ini menggunakan JavaScript dan CSS dengan Vite untuk pembangunan serta build. Data dan draf disimpan dalam pelayar. Log masuk, pangkalan data awan dan penyelarasan antara peranti belum dilaksanakan.

**Mula di komputer ini**

Gunakan Node.js 24. Buka terminal PowerShell dalam folder projek:

```powershell
npm.cmd ci
npm.cmd run dev
```

Buka `http://127.0.0.1:5173/`. Kekalkan alamat yang sama semasa pembangunan kerana storan pelayar berasingan mengikut alamat, protokol dan port.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

Build pengeluaran berada dalam `dist/`; pratonton build menggunakan `http://127.0.0.1:4173/`. Pratonton mempunyai storan pelayar berasingan daripada pelayan pembangunan. Gunakan eksport/import untuk memindahkan data. [Panduan deployment Vite](https://vite.dev/guide/static-deploy) menerangkan konfigurasi hosting bagi hasil build ini.

**Memindahkan data daripada HTML lama**

1. Buka `KHUTTAH_Prototype.html` melalui lokasi fail yang biasa digunakan.
2. Pilih ikon Tetapan di sebelah profil → Umum → Eksport untuk web app.
3. Buka web app baharu melalui alamat pembangunan atau hosting.
4. Pilih Tetapan → Umum → Import sandaran.
5. Semak bilangan rekod, nota dan kumpulan, kemudian sahkan penggantian data.

Import menggantikan data dan draf pada alamat web yang sedang dibuka. Eksport data semasa dahulu jika perlu mengekalkannya. Sandaran merangkumi rekod, nota, projek, kumpulan, subfolder dan tag yang telah disimpan; draf disimpan berasingan dalam pelayar.

Fail prototaip dikekalkan untuk rujukan dan eksport data lama. Perubahan baharu dibuat pada `src/` dan `index.html`.

**Fungsi semasa**

- Ringkasan dengan deadline tertunggak dan tujuh hari akan datang.
- Perancang Bulan, Minggu dan Hari dengan tugasan, acara dan peringatan berasingan.
- Tunda tugasan ke esok, seminggu lagi atau tarikh pilihan.
- Draf automatik untuk nota dan borang rekod, termasuk pemulihan selepas carian atau muat semula.
- Halaman Peribadi, Uthmani dan KPAZ yang menghimpunkan tugasan, acara 30 hari akan datang, deadline serta nota.
- Buat asal pemadaman rekod atau nota melalui mesej selama 12 saat, sehingga mesej tindakan seterusnya.
- Eksport/import JSON dengan pratonton, pengesahan struktur data dan pengesahan pengguna.
- Pemulihan data tersimpan yang tidak sah tanpa menindih salinan asal secara automatik.
- Bacaan & Kajian, Nota, Master dan PhD di bawah Ilmu dan Pengetahuan.

**Struktur projek**

```text
index.html                     Halaman masuk web app
src/app.js                     Antaramuka dan aliran aplikasi
src/styles.css                 Reka bentuk dan paparan responsif
src/storage.js                 Format, pengesahan dan sandaran data
src/drafts.js                  Penyimpanan serta pemulihan draf borang
tests/storage.test.js          Ujian sandaran, data lama dan data tidak sah
public/favicon.svg            Ikon aplikasi
.github/workflows/check.yml   Ujian dan build melalui GitHub Actions
KHUTTAH_Prototype.html         Prototaip lama dan alat eksport data
LAPORAN_SEMAKAN_HTML.md        Laporan sejarah bagi versi sebelum web app
```

**GitHub dan langkah seterusnya**

Repositori sasaran: [abusulaim94/Khuttah](https://github.com/abusulaim94/Khuttah).

Git menyimpan sejarah kod setempat. Push menghantar kod dan sejarah tersebut ke GitHub; fail sandaran peribadi dan `node_modules/` dikecualikan melalui `.gitignore`. Selepas akses disahkan, baca sejarah remote sebelum menyatukan serta menghantar perubahan. [Panduan rasmi GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github).

Urutan pembangunan selepas asas ini:

1. Sambungkan repositori GitHub dan pastikan ujian serta build Actions lulus.
2. Pilih hosting dan tetapkan satu alamat web yang stabil.
3. Import sandaran ke alamat tersebut dan uji penggunaan harian.
4. Tambah log masuk serta pangkalan data dengan akses mengikut pengguna untuk penyelarasan telefon dan komputer.
5. Tambah pemasangan PWA dan penggunaan luar talian selepas strategi simpanan serta konflik penyelarasan ditetapkan.

Hosting versi ini membolehkan antaramuka dibuka melalui web. Data masih berada pada setiap pelayar sehingga fungsi penyelarasan awan siap.
