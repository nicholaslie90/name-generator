#!/usr/bin/env node
/**
 * Generates src/data/biblicalNames.json from the curated list below.
 * Computes id / initial / syllables so the JSON satisfies the CommonName schema.
 *
 * Run: node scripts/build-biblical.mjs
 *
 * Each row: [name, origin, gender, meaning.id, meaning.en]
 *   origin: 'ibrani' (Hebrew/Aramaic) | 'yunani' (Greek) | 'latin'
 *   gender: 'L' (male) | 'P' (female)
 * Names/meanings are brief factual data (public-domain biblical onomastics).
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROWS = [
  // ---- Old Testament — men ----
  ['Adam', 'ibrani', 'L', 'manusia, dari tanah', 'man, of the earth'],
  ['Seth', 'ibrani', 'L', 'yang ditetapkan', 'appointed'],
  ['Enoch', 'ibrani', 'L', 'yang dibaktikan', 'dedicated'],
  ['Noah', 'ibrani', 'L', 'ketenangan, penghiburan', 'rest, comfort'],
  ['Abraham', 'ibrani', 'L', 'ayah dari banyak bangsa', 'father of many'],
  ['Isaac', 'ibrani', 'L', 'tawa', 'laughter'],
  ['Jacob', 'ibrani', 'L', 'penggenggam tumit', 'supplanter'],
  ['Joseph', 'ibrani', 'L', 'Tuhan akan menambahkan', 'God will add'],
  ['Benjamin', 'ibrani', 'L', 'putra tangan kanan', 'son of the right hand'],
  ['Judah', 'ibrani', 'L', 'pujian', 'praise'],
  ['Levi', 'ibrani', 'L', 'bersatu, terikat', 'joined'],
  ['Reuben', 'ibrani', 'L', 'lihatlah, seorang putra', 'behold, a son'],
  ['Simeon', 'ibrani', 'L', 'yang mendengar', 'he has heard'],
  ['Asher', 'ibrani', 'L', 'bahagia, beruntung', 'happy, blessed'],
  ['Moses', 'ibrani', 'L', 'diangkat dari air', 'drawn from the water'],
  ['Aaron', 'ibrani', 'L', 'yang ditinggikan', 'exalted'],
  ['Joshua', 'ibrani', 'L', 'Tuhan adalah keselamatan', 'the Lord is salvation'],
  ['Caleb', 'ibrani', 'L', 'setia, sepenuh hati', 'faithful, wholehearted'],
  ['Gideon', 'ibrani', 'L', 'penebang, pejuang perkasa', 'mighty warrior'],
  ['Samson', 'ibrani', 'L', 'seperti matahari', 'like the sun'],
  ['Samuel', 'ibrani', 'L', 'didengar oleh Tuhan', 'heard by God'],
  ['Saul', 'ibrani', 'L', 'yang diminta', 'asked for'],
  ['David', 'ibrani', 'L', 'yang dikasihi', 'beloved'],
  ['Solomon', 'ibrani', 'L', 'damai sejahtera', 'peace'],
  ['Nathan', 'ibrani', 'L', 'pemberian', 'he gave'],
  ['Jesse', 'ibrani', 'L', 'anugerah, Tuhan ada', 'gift, the Lord exists'],
  ['Elijah', 'ibrani', 'L', 'Tuhan adalah Allahku', 'my God is the Lord'],
  ['Elisha', 'ibrani', 'L', 'Tuhan adalah keselamatan', 'God is salvation'],
  ['Isaiah', 'ibrani', 'L', 'Tuhan adalah keselamatan', 'the Lord is salvation'],
  ['Jeremiah', 'ibrani', 'L', 'Tuhan meninggikan', 'the Lord exalts'],
  ['Ezekiel', 'ibrani', 'L', 'Tuhan menguatkan', 'God strengthens'],
  ['Daniel', 'ibrani', 'L', 'Tuhan adalah hakimku', 'God is my judge'],
  ['Ezra', 'ibrani', 'L', 'pertolongan', 'help'],
  ['Nehemiah', 'ibrani', 'L', 'dihibur oleh Tuhan', 'comforted by God'],
  ['Job', 'ibrani', 'L', 'yang teraniaya', 'persecuted'],
  ['Boaz', 'ibrani', 'L', 'kekuatan, ketangkasan', 'swiftness, strength'],
  ['Eli', 'ibrani', 'L', 'yang ditinggikan', 'ascended'],
  ['Hosea', 'ibrani', 'L', 'keselamatan', 'salvation'],
  ['Joel', 'ibrani', 'L', 'Tuhan adalah Allah', 'the Lord is God'],
  ['Amos', 'ibrani', 'L', 'dipikul oleh Tuhan', 'borne by God'],
  ['Jonah', 'ibrani', 'L', 'merpati', 'dove'],
  ['Micah', 'ibrani', 'L', 'siapa seperti Tuhan', 'who is like God'],
  ['Malachi', 'ibrani', 'L', 'utusanku', 'my messenger'],
  ['Zechariah', 'ibrani', 'L', 'Tuhan mengingat', 'the Lord remembers'],
  ['Obadiah', 'ibrani', 'L', 'hamba Tuhan', 'servant of the Lord'],
  ['Hezekiah', 'ibrani', 'L', 'Tuhan menguatkan', 'God strengthens'],
  ['Josiah', 'ibrani', 'L', 'Tuhan menyokong', 'the Lord supports'],
  ['Abel', 'ibrani', 'L', 'napas, kefanaan', 'breath'],
  ['Cain', 'ibrani', 'L', 'yang diperoleh', 'acquired'],
  ['Eliezer', 'ibrani', 'L', 'Tuhan adalah penolongku', 'God is my help'],
  ['Gabriel', 'ibrani', 'L', 'Tuhan adalah kekuatanku', 'God is my strength'],
  ['Michael', 'ibrani', 'L', 'siapa seperti Tuhan', 'who is like God'],
  ['Raphael', 'ibrani', 'L', 'Tuhan menyembuhkan', 'God heals'],
  ['Nathaniel', 'ibrani', 'L', 'anugerah dari Tuhan', 'gift of God'],
  ['Tobias', 'ibrani', 'L', 'Tuhan itu baik', 'God is good'],
  ['Immanuel', 'ibrani', 'L', 'Tuhan beserta kita', 'God is with us'],
  // ---- Old Testament — women ----
  ['Eve', 'ibrani', 'P', 'kehidupan', 'life'],
  ['Sarah', 'ibrani', 'P', 'puteri bangsawan', 'princess'],
  ['Rebecca', 'ibrani', 'P', 'yang memikat', 'captivating'],
  ['Rachel', 'ibrani', 'P', 'domba betina', 'ewe'],
  ['Leah', 'ibrani', 'P', 'lembut, jemu', 'delicate, weary'],
  ['Dinah', 'ibrani', 'P', 'yang dibenarkan', 'vindicated'],
  ['Miriam', 'ibrani', 'P', 'yang dikasihi', 'beloved'],
  ['Deborah', 'ibrani', 'P', 'lebah', 'bee'],
  ['Ruth', 'ibrani', 'P', 'sahabat, sahabat karib', 'companion, friend'],
  ['Naomi', 'ibrani', 'P', 'keramahan, kesenangan', 'pleasantness'],
  ['Hannah', 'ibrani', 'P', 'rahmat, anugerah', 'grace, favor'],
  ['Abigail', 'ibrani', 'P', 'sukacita sang ayah', "father's joy"],
  ['Esther', 'ibrani', 'P', 'bintang', 'star'],
  ['Tamar', 'ibrani', 'P', 'pohon kurma', 'palm tree'],
  ['Delilah', 'ibrani', 'P', 'yang lembut', 'delicate'],
  ['Zipporah', 'ibrani', 'P', 'burung', 'bird'],
  ['Susanna', 'ibrani', 'P', 'bunga bakung', 'lily'],
  ['Abigail', 'ibrani', 'P', 'sukacita sang ayah', "father's joy"],
  ['Bethany', 'ibrani', 'P', 'rumah buah ara', 'house of figs'],
  // ---- New Testament ----
  ['Mary', 'ibrani', 'P', 'yang dikasihi', 'beloved'],
  ['Martha', 'ibrani', 'P', 'nyonya rumah', 'lady'],
  ['Elizabeth', 'ibrani', 'P', 'Tuhan adalah sumpahku', 'God is my oath'],
  ['Joanna', 'ibrani', 'P', 'Tuhan itu pemurah', 'God is gracious'],
  ['Anna', 'ibrani', 'P', 'rahmat, anugerah', 'grace'],
  ['Magdalene', 'ibrani', 'P', 'dari Magdala', 'of Magdala'],
  ['Phoebe', 'yunani', 'P', 'cerah, berseri', 'bright, radiant'],
  ['Lydia', 'yunani', 'P', 'dari Lydia', 'from Lydia'],
  ['Priscilla', 'latin', 'P', 'purba, terhormat', 'ancient, venerable'],
  ['Tabitha', 'ibrani', 'P', 'kijang', 'gazelle'],
  ['Dorcas', 'yunani', 'P', 'kijang', 'gazelle'],
  ['Salome', 'ibrani', 'P', 'damai', 'peace'],
  ['Peter', 'yunani', 'L', 'batu karang', 'rock'],
  ['Andrew', 'yunani', 'L', 'jantan, gagah', 'manly'],
  ['Philip', 'yunani', 'L', 'pencinta kuda', 'lover of horses'],
  ['Thomas', 'ibrani', 'L', 'kembar', 'twin'],
  ['Matthew', 'ibrani', 'L', 'anugerah dari Tuhan', 'gift of God'],
  ['James', 'ibrani', 'L', 'penggenggam tumit', 'supplanter'],
  ['John', 'ibrani', 'L', 'Tuhan itu pemurah', 'God is gracious'],
  ['Paul', 'latin', 'L', 'kecil, rendah hati', 'small, humble'],
  ['Mark', 'latin', 'L', 'suka berperang', 'warlike'],
  ['Luke', 'latin', 'L', 'cahaya', 'light'],
  ['Stephen', 'yunani', 'L', 'mahkota', 'crown'],
  ['Timothy', 'yunani', 'L', 'menghormati Tuhan', 'honoring God'],
  ['Titus', 'latin', 'L', 'terhormat', 'honorable'],
  ['Barnabas', 'ibrani', 'L', 'putra penghiburan', 'son of encouragement'],
  ['Silas', 'latin', 'L', 'dari hutan', 'of the forest'],
  ['Cornelius', 'latin', 'L', 'tanduk', 'horn'],
  ['Nicodemus', 'yunani', 'L', 'kemenangan rakyat', 'victory of the people'],
  ['Theophilus', 'yunani', 'L', 'sahabat Tuhan', 'friend of God'],
  ['Lazarus', 'ibrani', 'L', 'Tuhan telah menolong', 'God has helped'],
  ['Bartholomew', 'ibrani', 'L', 'putra Tolmai', 'son of Tolmai'],
  ['Matthias', 'ibrani', 'L', 'anugerah dari Tuhan', 'gift of God'],
  ['Stephanas', 'yunani', 'L', 'bermahkota', 'crowned'],
  ['Jude', 'ibrani', 'L', 'pujian', 'praise'],
];

function syllables(name) {
  const groups = name.toLowerCase().match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

// Dedupe rows by name+gender (the list has a couple of intentional repeats).
const seen = new Set();
const out = [];
for (const [name, origin, gender, id, en] of ROWS) {
  const key = `${name.toLowerCase()}|${gender}`;
  if (seen.has(key)) continue;
  seen.add(key);
  out.push({
    id: `bib-${name.toLowerCase()}-${gender.toLowerCase()}`,
    name,
    initial: name[0].toLowerCase(),
    syllables: syllables(name),
    origin,
    gender,
    meaning: { id, en },
    biblical: true,
  });
}

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, '..', 'src', 'data', 'biblicalNames.json');
writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${out.length} biblical names to ${file}`);
