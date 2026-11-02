-- ============================================================
-- AMAL TRACKER — SEED DATA
-- ============================================================

-- ---- KATEGORI ----
insert into public.amal_categories (slug, name, description, icon, sort_order) values
('ibadah-wajib', 'Ibadah Wajib', 'Kewajiban dasar seorang Muslim', '🕌', 1),
('ibadah-sunah', 'Ibadah Sunah', 'Amalan sunah yang dianjurkan', '🌙', 2),
('al-quran', 'Al-Qur''an', 'Interaksi dengan Kitabullah', '📖', 3),
('akhlak', 'Akhlak', 'Penyucian diri dan karakter', '💎', 4),
('sosial', 'Sosial', 'Hubungan dengan sesama', '🤝', 5),
('evaluasi-diri', 'Evaluasi Diri', 'Perilaku yang perlu ditinggalkan', '🔍', 6)
on conflict (slug) do nothing;

-- ---- AMALAN: IBADAH WAJIB ----
insert into public.amalan (category_id, slug, name, description, amal_type, default_unit, is_negative, verification_status)
select c.id, v.slug, v.name, v.description, v.amal_type, v.default_unit, v.is_negative, v.verification_status
from public.amal_categories c,
(values
  ('ibadah-wajib', 'salat-subuh', 'Salat Subuh', 'Salat fardu Subuh', 'wajib', 'kali', false, 'verified'),
  ('ibadah-wajib', 'salat-dzuhur', 'Salat Dzuhur', 'Salat fardu Dzuhur', 'wajib', 'kali', false, 'verified'),
  ('ibadah-wajib', 'salat-ashar', 'Salat Ashar', 'Salat fardu Ashar', 'wajib', 'kali', false, 'verified'),
  ('ibadah-wajib', 'salat-maghrib', 'Salat Maghrib', 'Salat fardu Maghrib', 'wajib', 'kali', false, 'verified'),
  ('ibadah-wajib', 'salat-isya', 'Salat Isya', 'Salat fardu Isya', 'wajib', 'kali', false, 'verified'),
  ('ibadah-wajib', 'puasa-ramadan', 'Puasa Ramadan', 'Puasa wajib di bulan Ramadan', 'wajib', 'hari', false, 'verified'),
  ('ibadah-wajib', 'zakat-fitrah', 'Zakat Fitrah', 'Zakat yang wajib ditunaikan sebelum Idul Fitri', 'wajib', 'kali', false, 'verified'),
  ('ibadah-wajib', 'zakat-mal', 'Zakat Mal', 'Zakat harta jika mencapai nishab dan haul', 'wajib', 'kali', false, 'verified')
) as v(cat_slug, slug, name, description, amal_type, default_unit, is_negative, verification_status)
where c.slug = v.cat_slug
on conflict (slug) do nothing;

-- ---- AMALAN: IBADAH SUNAH ----
insert into public.amalan (category_id, slug, name, description, amal_type, default_unit, is_negative, verification_status)
select c.id, v.slug, v.name, v.description, v.amal_type, v.default_unit, v.is_negative, v.verification_status
from public.amal_categories c,
(values
  ('ibadah-sunah', 'salat-duha', 'Salat Duha', 'Salat sunah di waktu Duha', 'sunah', 'kali', false, 'verified'),
  ('ibadah-sunah', 'salat-tahajud', 'Salat Tahajud', 'Salat malam setelah tidur', 'sunah', 'kali', false, 'verified'),
  ('ibadah-sunah', 'salat-rawatib', 'Salat Rawatib', 'Salat sunah pengiring salat fardu', 'sunah', 'kali', false, 'verified'),
  ('ibadah-sunah', 'salat-witir', 'Salat Witir', 'Salat penutup malam', 'sunah', 'kali', false, 'verified'),
  ('ibadah-sunah', 'puasa-senin-kamis', 'Puasa Senin & Kamis', 'Puasa sunah hari Senin dan Kamis', 'sunah', 'hari', false, 'verified'),
  ('ibadah-sunah', 'puasa-ayyamul-bidh', 'Puasa Ayyamul Bidh', 'Puasa sunah tanggal 13, 14, 15 Hijriah', 'sunah', 'hari', false, 'verified'),
  ('ibadah-sunah', 'sedekah-subuh', 'Sedekah Subuh', 'Sedekah di waktu pagi', 'sunah', 'kali', false, 'needs_review'),
  ('ibadah-sunah', 'dzikir-pagi-sore', 'Dzikir Pagi & Sore', 'Dzikir yang dianjurkan pagi dan sore', 'sunah', 'kali', false, 'verified')
) as v(cat_slug, slug, name, description, amal_type, default_unit, is_negative, verification_status)
where c.slug = v.cat_slug
on conflict (slug) do nothing;

-- ---- AMALAN: AL-QUR'AN ----
insert into public.amalan (category_id, slug, name, description, amal_type, default_unit, is_negative, verification_status)
select c.id, v.slug, v.name, v.description, v.amal_type, v.default_unit, v.is_negative, v.verification_status
from public.amal_categories c,
(values
  ('al-quran', 'tilawah', 'Membaca Al-Qur''an', 'Membaca mushaf atau hafalan', 'sunah', 'halaman', false, 'verified'),
  ('al-quran', 'tadabbur', 'Tadabbur/Tafsir', 'Mempelajari tafsir ayat', 'sunah', 'menit', false, 'verified'),
  ('al-quran', 'hafalan', 'Menghafal Al-Qur''an', 'Menambah hafalan', 'sunah', 'ayat', false, 'verified'),
  ('al-quran', 'tajwid', 'Belajar Tajwid', 'Mempelajari kaidah tajwid', 'sunah', 'menit', false, 'verified'),
  ('al-quran', 'murajaah', 'Murajaah Hafalan', 'Mengulang hafalan', 'sunah', 'halaman', false, 'verified')
) as v(cat_slug, slug, name, description, amal_type, default_unit, is_negative, verification_status)
where c.slug = v.cat_slug
on conflict (slug) do nothing;

-- ---- AMALAN: AKHLAK ----
insert into public.amalan (category_id, slug, name, description, amal_type, default_unit, is_negative, verification_status)
select c.id, v.slug, v.name, v.description, v.amal_type, v.default_unit, v.is_negative, v.verification_status
from public.amal_categories c,
(values
  ('akhlak', 'jujur', 'Jujur', 'Berkata dan bertindak jujur', 'akhlak', 'kali', false, 'verified'),
  ('akhlak', 'sabar', 'Sabar', 'Menahan diri dari keluh kesah', 'akhlak', 'kali', false, 'verified'),
  ('akhlak', 'amanah', 'Menjaga Amanah', 'Menunaikan tanggung jawab', 'akhlak', 'kali', false, 'verified'),
  ('akhlak', 'menahan-amarah', 'Menahan Amarah', 'Mengendalikan emosi', 'akhlak', 'kali', false, 'verified'),
  ('akhlak', 'menjaga-lisan', 'Menjaga Lisan', 'Menghindari perkataan buruk', 'akhlak', 'kali', false, 'verified'),
  ('akhlak', 'tafakur', 'Tafakur/Muhasabah', 'Merenungkan diri', 'akhlak', 'menit', false, 'unverified'),
  ('akhlak', 'birrul-walidain', 'Berbakti kepada Orang Tua', 'Berbuat baik kepada orang tua', 'akhlak', 'kali', false, 'verified'),
  ('akhlak', 'syukur', 'Syukur', 'Mengakui dan memanfaatkan nikmat untuk kebaikan', 'akhlak', 'kali', false, 'verified'),
  ('akhlak', 'tawadhu', 'Tawadhu', 'Rendah hati', 'akhlak', 'kali', false, 'verified'),
  ('akhlak', 'istiqamah', 'Istiqamah', 'Konsisten dalam kebaikan', 'akhlak', 'kali', false, 'verified')
) as v(cat_slug, slug, name, description, amal_type, default_unit, is_negative, verification_status)
where c.slug = v.cat_slug
on conflict (slug) do nothing;

-- ---- AMALAN: SOSIAL ----
insert into public.amalan (category_id, slug, name, description, amal_type, default_unit, is_negative, verification_status)
select c.id, v.slug, v.name, v.description, v.amal_type, v.default_unit, v.is_negative, v.verification_status
from public.amal_categories c,
(values
  ('sosial', 'sedekah', 'Sedekah', 'Memberi harta di jalan Allah', 'sosial', 'kali', false, 'verified'),
  ('sosial', 'membantu-sesama', 'Membantu Sesama', 'Menolong orang lain', 'sosial', 'kali', false, 'verified'),
  ('sosial', 'menjenguk-sakit', 'Menjenguk Orang Sakit', 'Mengunjungi orang yang sakit', 'sosial', 'kali', false, 'verified'),
  ('sosial', 'silaturahmi', 'Silaturahmi', 'Menyambung hubungan kekerabatan', 'sosial', 'kali', false, 'verified'),
  ('sosial', 'infak', 'Infak', 'Mengeluarkan harta untuk kepentingan umum', 'sosial', 'kali', false, 'verified'),
  ('sosial', 'menyantuni-yatim', 'Menyantuni Yatim', 'Memuliakan anak yatim', 'sosial', 'kali', false, 'verified'),
  ('sosial', 'berbagi-makanan', 'Berbagi Makanan', 'Memberi makan kepada yang membutuhkan', 'sosial', 'kali', false, 'verified'),
  ('sosial', 'menolong-tetangga', 'Menolong Tetangga', 'Membantu kebutuhan tetangga', 'sosial', 'kali', false, 'verified'),
  ('sosial', 'memaafkan', 'Memaafkan', 'Memaafkan kesalahan orang lain', 'sosial', 'kali', false, 'verified'),
  ('sosial', 'mendoakan-orang-lain', 'Mendoakan Orang Lain', 'Mendoakan kebaikan untuk orang lain', 'sosial', 'kali', false, 'verified')
) as v(cat_slug, slug, name, description, amal_type, default_unit, is_negative, verification_status)
where c.slug = v.cat_slug
on conflict (slug) do nothing;

-- ---- AMALAN: EVALUASI DIRI (perilaku negatif) ----
insert into public.amalan (category_id, slug, name, description, amal_type, default_unit, is_negative, verification_status)
select c.id, v.slug, v.name, v.description, v.amal_type, v.default_unit, v.is_negative, v.verification_status
from public.amal_categories c,
(values
  ('evaluasi-diri', 'berbohong', 'Berbohong', 'Berkata tidak sesuai fakta', 'evaluasi', 'kali', true, 'verified'),
  ('evaluasi-diri', 'ghibah', 'Ghibah', 'Membicarakan keburukan orang lain', 'evaluasi', 'kali', true, 'verified'),
  ('evaluasi-diri', 'namimah', 'Namimah (Adu Domba)', 'Menyebarkan perkataan untuk memecah belah', 'evaluasi', 'kali', true, 'verified'),
  ('evaluasi-diri', 'menyakiti-orang', 'Menyakiti Orang', 'Melukai perasaan atau fisik orang lain', 'evaluasi', 'kali', true, 'verified'),
  ('evaluasi-diri', 'mengingkari-janji', 'Mengingkari Janji', 'Tidak menepati janji', 'evaluasi', 'kali', true, 'verified'),
  ('evaluasi-diri', 'mubazir', 'Mubazir/Boros', 'Menggunakan harta secara berlebihan', 'evaluasi', 'kali', true, 'verified'),
  ('evaluasi-diri', 'ria', 'Ria (Pamer)', 'Melakukan amal untuk dipuji manusia', 'evaluasi', 'kali', true, 'verified'),
  ('evaluasi-diri', 'hasad', 'Hasad (Dengki)', 'Membenci nikmat yang ada pada orang lain', 'evaluasi', 'kali', true, 'verified'),
  ('evaluasi-diri', 'sombong', 'Sombong/Takabur', 'Merasa lebih tinggi dari orang lain', 'evaluasi', 'kali', true, 'verified'),
  ('evaluasi-diri', 'malas-ibadah', 'Malas Beribadah', 'Menunda atau meninggalkan ibadah tanpa udzur', 'evaluasi', 'kali', true, 'needs_review')
) as v(cat_slug, slug, name, description, amal_type, default_unit, is_negative, verification_status)
where c.slug = v.cat_slug
on conflict (slug) do nothing;

-- ---- REFERENSI (hanya yang dapat diverifikasi) ----
-- Format: (amalan_slug, type, source, detail, arabic, translation, grading, is_primary)

insert into public.amal_references (amalan_id, reference_type, source_name, reference_detail, arabic_text, translation_text, grading, is_primary)
select a.id, v.ref_type, v.source, v.detail, v.arabic, v.translation, v.grading, v.is_primary
from public.amalan a,
(values
  -- Salat lima waktu
  ('salat-subuh', 'quran', 'Al-Qur''an', 'QS. Al-Isra: 78', 'أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ إِلَىٰ غَسَقِ اللَّيْلِ وَقُرْآنَ الْفَجْرِ ۖ إِنَّ قُرْآنَ الْفَجْرِ كَانَ مَشْهُودًا', 'Dirikanlah salat dari sesudah matahari tergelincir sampai gelap malam dan (dirikanlah pula salat) Subuh. Sesungguhnya salat Subuh itu disaksikan (oleh malaikat).', null, true),
  ('salat-dzuhur', 'quran', 'Al-Qur''an', 'QS. Al-Isra: 78', 'أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ إِلَىٰ غَسَقِ اللَّيْلِ', 'Dirikanlah salat dari sesudah matahari tergelincir sampai gelap malam.', null, true),
  ('salat-ashar', 'hadith', 'Sahih Bukhari', 'HR. Bukhari no. 527', null, 'Barangsiapa meninggalkan salat Ashar, maka seakan-akan dia kehilangan keluarga dan hartanya.', 'Sahih', true),
  ('salat-maghrib', 'quran', 'Al-Qur''an', 'QS. Hud: 114', 'وَأَقِمِ الصَّلَاةَ طَرَفَيِ النَّهَارِ وَزُلَفًا مِّنَ اللَّيْلِ', 'Dan dirikanlah salat pada kedua ujung siang (pagi dan petang) dan pada bagian permulaan malam.', null, true),
  ('salat-isya', 'quran', 'Al-Qur''an', 'QS. Al-Isra: 78', 'إِلَىٰ غَسَقِ اللَّيْلِ', 'sampai gelap malam', null, true),
  ('puasa-ramadan', 'quran', 'Al-Qur''an', 'QS. Al-Baqarah: 183', 'يَا أَيُّهَا الَّذِينَ آمَنُوا كُتِبَ عَلَيْكُمُ الصِّيَامُ كَمَا كُتِبَ عَلَى الَّذِينَ مِن قَبْلِكُمْ لَعَلَّكُمْ تَتَّقُونَ', 'Hai orang-orang yang beriman, diwajibkan atas kamu berpuasa sebagaimana diwajibkan atas orang-orang sebelum kamu agar kamu bertakwa.', null, true),
  ('zakat-mal', 'quran', 'Al-Qur''an', 'QS. Al-Baqarah: 43', 'وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ', 'Dan dirikanlah salat, tunaikanlah zakat.', null, true),
  -- Ibadah sunah
  ('salat-duha', 'hadith', 'Sahih Muslim', 'HR. Muslim no. 719', null, 'Salat Duha itu adalah salat orang-orang yang kembali (kepada Allah).', 'Sahih', true),
  ('salat-tahajud', 'quran', 'Al-Qur''an', 'QS. Al-Isra: 79', 'وَمِنَ اللَّيْلِ فَتَهَجَّدْ بِهِ نَافِلَةً لَّكَ', 'Dan pada sebagian malam hari, salat tahajudlah kamu sebagai suatu ibadah tambahan bagimu.', null, true),
  ('salat-witir', 'hadith', 'Sahih Bukhari', 'HR. Bukhari no. 990', null, 'Jadikanlah witir sebagai salat terakhir kalian di malam hari.', 'Sahih', true),
  ('puasa-senin-kamis', 'hadith', 'Sahih Muslim', 'HR. Muslim no. 1162', null, 'Amal-amal itu dihadapkan pada hari Senin dan Kamis.', 'Sahih', true),
  -- Al-Qur'an
  ('tilawah', 'quran', 'Al-Qur''an', 'QS. Al-Muzzammil: 4', 'وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا', 'Dan bacalah Al-Qur''an itu dengan tartil.', null, true),
  ('tadabbur', 'quran', 'Al-Qur''an', 'QS. Shad: 29', 'كِتَابٌ أَنزَلْنَاهُ إِلَيْكَ مُبَارَكٌ لِّيَدَّبَّرُوا آيَاتِهِ', 'Ini adalah sebuah kitab yang Kami turunkan kepadamu penuh dengan berkah supaya mereka memperhatikan ayat-ayatnya.', null, true),
  -- Akhlak
  ('jujur', 'hadith', 'Sahih Bukhari', 'HR. Bukhari no. 6094', null, 'Sesungguhnya kejujuran menuntun kepada kebaikan, dan kebaikan menuntun kepada surga.', 'Sahih', true),
  ('sabar', 'quran', 'Al-Qur''an', 'QS. Al-Baqarah: 153', 'يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', 'Hai orang-orang yang beriman, jadikanlah sabar dan salat sebagai penolongmu, sesungguhnya Allah beserta orang-orang yang sabar.', null, true),
  ('menahan-amarah', 'hadith', 'Sahih Bukhari', 'HR. Bukhari no. 6114', null, 'Orang yang kuat bukanlah yang menang dalam gulat, tetapi orang yang dapat menahan dirinya ketika marah.', 'Sahih', true),
  ('menjaga-lisan', 'hadith', 'Sahih Bukhari', 'HR. Bukhari no. 6018', null, 'Barangsiapa beriman kepada Allah dan hari akhir, hendaklah ia berkata baik atau diam.', 'Sahih', true),
  ('birrul-walidain', 'quran', 'Al-Qur''an', 'QS. Al-Isra: 23', 'وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا', 'Dan Tuhanmu telah memerintahkan supaya kamu jangan menyembah selain Dia dan hendaklah kamu berbuat baik pada ibu bapakmu dengan sebaik-baiknya.', null, true),
  -- Sosial
  ('sedekah', 'quran', 'Al-Qur''an', 'QS. Al-Baqarah: 261', 'مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ', 'Perumpamaan orang-orang yang menafkahkan hartanya di jalan Allah adalah serupa dengan sebutir benih yang menumbuhkan tujuh bulir.', null, true),
  ('silaturahmi', 'hadith', 'Sahih Bukhari', 'HR. Bukhari no. 5985', null, 'Barangsiapa ingin dilapangkan rezekinya dan dipanjangkan umurnya, hendaklah ia menyambung silaturahmi.', 'Sahih', true),
  ('menjenguk-sakit', 'hadith', 'Sahih Muslim', 'HR. Muslim no. 2568', null, 'Barangsiapa menjenguk orang sakit, ia senantiasa berada dalam khurfah surga.', 'Sahih', true),
  -- Evaluasi (larangan)
  ('ghibah', 'quran', 'Al-Qur''an', 'QS. Al-Hujurat: 12', 'وَلَا يَغْتَب بَّعْضُكُم بَعْضًا', 'Dan janganlah kamu menggunjing satu sama lain.', null, true),
  ('berbohong', 'hadith', 'Sahih Bukhari', 'HR. Bukhari no. 6094', null, 'Sesungguhnya dusta menuntun kepada kejahatan, dan kejahatan menuntun kepada neraka.', 'Sahih', true),
    ('mubazir', 'quran', 'Al-Qur''an', 'QS. Al-Isra: 27', 'إِنَّ الْمُبَذِّرِينَ كَانُوا إِخْوَانَ الشَّيَاطِينِ', 'Sesungguhnya orang-orang yang boros itu adalah saudara-saudara setan.', null, true),
  ('mengingkari-janji', 'quran', 'Al-Qur''an', 'QS. Al-Isra: 34', 'وَأَوْفُوا بِالْعَهْدِ ۖ إِنَّ الْعَهْدَ كَانَ مَسْئُولًا', 'Dan penuhilah janji, sesungguhnya janji itu pasti diminta pertanggungjawabannya.', null, true),
  ('hasad', 'hadith', 'Sahih Bukhari', 'HR. Bukhari no. 6065', null, 'Janganlah kalian saling mendengki, saling membenci, dan saling membelakangi.', 'Sahih', true),
  ('sombong', 'hadith', 'Sahih Muslim', 'HR. Muslim no. 91', null, 'Tidak akan masuk surga orang yang di dalam hatinya ada kesombongan sebesar biji sawi.', 'Sahih', true),
  ('ria', 'hadith', 'Sahih Muslim', 'HR. Muslim no. 2985', null, 'Barangsiapa mengerjakan suatu amal yang di dalamnya ia menyekutukan-Ku dengan selain-Ku, Aku tinggalkan dia dan sekutunya.', 'Sahih', true),
  ('namimah', 'hadith', 'Sahih Muslim', 'HR. Muslim no. 105', null, 'Tidak akan masuk surga orang yang suka mengadu domba.', 'Sahih', true)
) as v(amalan_slug, ref_type, source, detail, arabic, translation, grading, is_primary)
where a.slug = v.amalan_slug;

-- Cek: total amalan harus >= 20 ibadah, 20 akhlak, 15 sosial, 15 evaluasi
-- Bila kurang, aplikasi tetap berjalan; cukup tambahkan baris baru.
