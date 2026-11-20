# KHUTTAH · Prototaip premium

Redesign setempat dengan warna hijau hutan, ivory dan emas lembut, tipografi editorial dan ruang kandungan yang lapang.

## Buka prototaip

Klik dua kali `index.html` dalam folder ini. Tiada pemasangan atau log masuk diperlukan. Sambungan internet hanya digunakan untuk fon Google; fon sistem digunakan jika tiada internet.

Pilihan melalui pelayan pembangunan dari folder utama repositori:

```powershell
npm.cmd run dev
```

Buka `http://127.0.0.1:5173/prototypes/luxury/`.

## Interaksi yang tersedia

- Ringkasan tugasan, acara, nota dan karya menggunakan data contoh.
- Tambah tugasan, tandakan selesai, tapis status dan kumpulan.
- Perancang bulanan, pilihan tarikh, navigasi bulan dan tambah acara.
- Tambah dan sunting nota, termasuk catatan mengikut karya.
- Ruang Peribadi, Uthmani dan KPAZ.
- Carian tugasan, acara dan nota melalui butang carian atau `Ctrl+K` / `Cmd+K`.
- Pemasa fokus 25 minit yang boleh dijeda sepanjang tab dibuka.
- Tetapan untuk memulihkan data contoh dengan pengesahan.
- Navigasi responsif untuk komputer, tablet dan telefon.

Data disimpan pada kunci `khuttah-luxury-prototype-v1` dalam storan pelayar. Prototaip tidak membaca data, sesi log masuk atau konfigurasi Supabase aplikasi utama. Simpanan berasingan mengikut pelayar/alamat; mod fail setempat bergantung pada sokongan storan pelayar. Pemasa fokus bermula semula selepas halaman dimuat semula.

Ini prototaip interaktif terpilih, bukan pengganti semua modul aplikasi asal. Ia tidak menyediakan penyelarasan awan, suntingan/pemadaman acara, atau penyuntingan buku. Folder ini tidak dimasukkan ke hasil build Vite aplikasi utama dan tidak menerbitkan redesign ke GitHub Pages.
