/* Genre buckets for the search chips. A song's style prompt starts with its
   genre, so only the first ~160 characters are matched; a song can sit in
   several buckets (an "electro-funk" track shows up under both). */
export const GENRES = [
  { key: "rock", label: "Rock", rx: /\brock\b|grunge|indie|britpop|alternative/ },
  { key: "pop", label: "Pop", rx: /\bpop\b|synth-?pop|k-?pop/ },
  { key: "hiphop", label: "Hip-hop", rx: /hip[- ]?hop|\brap\b|trap|boom bap|drill/ },
  { key: "electronic", label: "Electronic", rx: /electro|techno|house|edm|trance|dubstep|drum and bass|dnb|synthwave|garage|breakbeat|hardbass|rave/ },
  { key: "jazz", label: "Jazz", rx: /jazz|swing|bebop|scat|bossa/ },
  { key: "funk", label: "Funk & Soul", rx: /funk|soul|r&b|rnb|disco|motown/ },
  { key: "folk", label: "Folk & Country", rx: /folk|country|bluegrass|singer-songwriter|americana|klezmer|balalaika|chanson|bard/ },
  { key: "blues", label: "Blues", rx: /blues/ },
  { key: "metal", label: "Metal & Punk", rx: /metal|punk|hardcore|thrash|emo\b/ },
  { key: "classical", label: "Classical", rx: /orchestr|classical|symphon|opera|cinematic|chamber|baroque|choir/ },
  { key: "ambient", label: "Ambient", rx: /ambient|shoegaze|chill|lo-?fi|dream|atmospheric|downtempo/ },
  { key: "latin", label: "Latin & Reggae", rx: /latin|reggae|ska\b|salsa|flamenco|afro|reggaeton|cumbia|tango/ },
] as const;

export type GenreKey = (typeof GENRES)[number]["key"];

export function genresOf(tags: string | undefined): GenreKey[] {
  const t = (tags ?? "").toLowerCase().slice(0, 160);
  return GENRES.filter(g => g.rx.test(t)).map(g => g.key);
}
