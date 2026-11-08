**Laporan semakan KHUTTAH_Prototype.html**

Nota: Laporan ini ialah rekod semakan versi awal sebelum penambahan Tunda, susunan menu baharu dan penyediaan web app. Rujukan baris merujuk versi yang disemak ketika itu. Status versi semasa diterangkan dalam README.md.

Tarikh: 7 November 2026 · Fail: 60,873 bait, 704 baris · Semakan kod dan ujian Chrome tanpa tetingkap dengan profil ujian berasingan.

Fungsi asas prototaip berjalan dalam ujian. Lima isu yang boleh dihasilkan semula ditemui, melibatkan kehilangan draf, skop pemadaman acara berulang, pemulihan data tersimpan, fokus papan kekunci dan paparan nama folder panjang. Perlindungan draf dan penjelasan pemadaman siri wajar diberi keutamaan sebelum digunakan untuk catatan harian.

**Penemuan dan cadangan**

| Bil. | Keutamaan | Penemuan | Lokasi kod |
| --- | --- | --- | --- |
| 1 | Tinggi | Ctrl+K menggantikan borang dan menghilangkan draf yang belum disimpan. | `openDialog()`, baris 507–509; pintasan, baris 698–699 |
| 2 | Sederhana | Memadam satu kemunculan acara berulang membuang seluruh siri, tetapi pengesahan hanya menyebut “rekod”. | Pembentukan ulangan, baris 257–265; tindakan padam, baris 615–617 |
| 3 | Sederhana | Data localStorage yang sah sebagai JSON tetapi tidak lengkap boleh menyebabkan paparan utama kosong. | Pemuatan storan, baris 146–164; penggunaan folder, baris 219 |
| 4 | Sederhana | Fokus papan kekunci hilang selepas beberapa tindakan yang membina semula paparan. | `render()`, baris 227–233; navigasi, baris 574–580; kotak selesai, baris 661–663 |
| 5 | Rendah | Nama folder panjang tanpa ruang melimpah dan bertindih dengan butang pada skrin kecil. | CSS `.row-main`, baris 8; nama folder dalam Tetapan, baris 467 |

1. **Draf hilang apabila membuka carian.** Buka Nota → Tambah nota, isi tajuk dan catatan, kemudian tekan Ctrl+K. Dialog bertukar kepada Carian ruang kerja dan borang asal dikeluarkan daripada DOM. Tiada salinan draf disimpan oleh aliran ini. Puncanya ialah `openDialog()` menggantikan `modal.innerHTML` walaupun dialog sedang terbuka. Cadangan: simpan dan pulihkan draf apabila carian dibuka, atau kekalkan borang asal dan tangguhkan pintasan semasa menyunting. Gunakan perlindungan yang sama untuk borang rekod lain.

2. **Pengesahan pemadaman tidak menerangkan bahawa seluruh siri terlibat.** Dengan data contoh, buka Perancang → Hari → 12 November 2026, pilih “Semakan operasi”, kemudian Padam dan sahkan. Kemunculan 19 November serta rekod asal 5 November turut hilang. Semua kemunculan menggunakan ID rekod yang sama; dialog tidak menerangkan skop itu. Cadangan minimum: nyatakan “Padam seluruh siri acara berulang?” dan jelaskan kesannya. Jika pemadaman satu kemunculan diperlukan, simpan pengecualian berdasarkan tarikh. Suntingan juga membuka tarikh asal siri; labelkan skop suntingan dengan jelas.

3. **Tiada pengesahan struktur data tersimpan sebelum digunakan.** Dalam profil ujian, tetapkan nilai kunci `khuttah-prototype-v2` kepada `{"records":[]}` lalu muat semula. Pelayar melaporkan `TypeError: domains is not iterable`, dan kandungan utama tidak dirender. Ini ialah ujian data tidak lengkap yang disengajakan; data biasa yang dihasilkan aplikasi berjaya dimuat semula. `JSON.parse()` sahaja tidak mengesahkan struktur, dan ralat penggunaan berlaku di luar blok `try`. Cadangan: sahkan medan serta jenis data ke dalam pemboleh ubah sementara sebelum menggantikan keadaan aplikasi. Sediakan aliran pemulihan yang mengekalkan salinan data bermasalah untuk dipulihkan.

4. **Fokus kembali kepada BODY selepas tindakan tertentu.** Fokuskan kotak selesai tugasan lalu aktifkannya; selepas `save()` memanggil `render()`, `document.activeElement` menjadi `BODY`. Perkara yang sama berlaku apabila memilih menu desktop. Ini menyukarkan pengguna papan kekunci meneruskan kerja, khususnya apabila tugasan yang selesai dikeluarkan daripada senarai. Cadangan: selepas render, pindahkan fokus ke kawalan setara, tugasan bersebelahan atau tajuk kandungan yang sesuai. Navigasi bawah dan menu Lagi sudah memulihkan fokus dalam ujian; gunakan pendekatan konsisten untuk tindakan lain.

5. **Teks folder panjang tidak membalut dalam Tetapan.** Pada skrin 320 piksel, cipta nama folder dengan 45 huruf `W` tanpa ruang; panjang ini dibenarkan borang. `document.documentElement.clientWidth` ialah 320 tetapi `document.body.scrollWidth` menjadi 658. Nama melimpah di belakang butang Sunting dan Buang. Cadangan: benarkan pemecahan perkataan pada nama folder, contohnya `overflow-wrap:anywhere`, dan pastikan tindakan mempunyai ruang sendiri. Isu ini tidak muncul dengan nama folder contoh.

**Pengesahan yang berjaya**

| Semakan | Hasil |
| --- | --- |
| Sintaks JavaScript sebaris | Lulus pemeriksaan sintaks Node.js. |
| Sepuluh modul pada lebar 1440, 1024, 768, 390 dan 320 piksel | Kesemua 50 kombinasi menghasilkan tajuk modul; tiada ID berulang atau limpahan mendatar halaman dengan data contoh. |
| Tambah, sunting dan padam tugasan | Lulus; pemadaman memerlukan pengesahan. |
| Tambah subfolder, tag dan nota peribadi | Lulus; nota menerima subfolder dan tag yang dipilih. |
| Tambah dan pindahkan nota tesis | Lulus menggunakan pilihan lokasi bab. |
| Penjanaan acara berulang setiap minggu | Lulus untuk tarikh minggu berikutnya. |
| Penyimpanan selepas muat semula | Bilangan rekod, nota dan subfolder kekal dalam profil ujian. |
| Navigasi bawah, menu Lagi dan penapisan folder | Lulus untuk aliran yang diuji. |
| Dialog tambah rekod, tambah nota dan Lagi pada 320 piksel | Tiada limpahan mendatar dalam dialog dengan data contoh. |

Dokumen mempunyai `doctype`, `lang="ms"`, UTF-8 dan tetapan viewport. Banyak kawalan sudah mempunyai label, keadaan ARIA dan gaya fokus. Fungsi `html()` mengekod aksara khas pada banyak teks yang dimasukkan ke dalam templat. Tiada rujukan `src` atau `href` kepada sumber luar ditemui dalam fail ini.

**Had dan susulan**

Ini ialah semakan prototaip setempat. Ujian menggunakan Chrome dengan emulasi saiz skrin; Safari, Firefox, telefon sebenar, pembaca skrin dan pematuhan penuh validator HTML belum diuji. Keputusan dialog dan susun atur terpakai kepada data serta saiz yang dinyatakan.

Data disimpan dalam localStorage pelayar; fail ini belum menyediakan eksport/import atau penyelarasan antara peranti. Untuk kegunaan catatan jangka panjang, fungsi eksport/import akan membantu pengguna membuat sandaran.

Satu isu sempadan tarikh turut diperhatikan: `isoOf()` pada baris 169 memotong ISO kepada 10 aksara. Selepas 31 Disember 9999, hasilnya `+010000-01`, dan penambahan hari seterusnya menghasilkan nilai sama. Jika julat kalendar melintasi sempadan ini, gelung `itemsInRange()` tidak maju. Ini kes pinggiran berkeutamaan rendah; hadkan julat navigasi/tarikh atau kendalikan tahun panjang jika sokongan sehingga tahun 9999 dikekalkan.

Fail HTML asal tidak diubah. Semua perubahan data ujian dibuat dalam profil pelayar berasingan.
