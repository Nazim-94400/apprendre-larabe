/**
 * Coupe schématique de l'appareil phonatoire.
 *
 * Dessinée à la main plutôt qu'importée : une planche anatomique réaliste serait
 * illisible en petit et poserait un problème de droits. Ce qu'un apprenant doit
 * retenir tient en cinq zones et leur position relative — le reste est du bruit.
 *
 * Choix de rendu : des contours plutôt que des aplats. Un premier essai en formes
 * pleines superposées donnait une masse noire indéchiffrable en thème sombre ;
 * chaque région est donc cernée d'un trait et ne se remplit qu'une fois active.
 *
 * Le tracé regarde vers la gauche — lèvres à gauche, gorge à droite — comme dans
 * tous les manuels de tajwîd.
 *
 * Les coordonnées des points sont ici et non dans makharij.json : ce sont des
 * détails de présentation, pas des données pédagogiques.
 */

export const POINT_MARKERS = {
  jawf:            { x: 190, y: 148 },
  halq_aqsa:       { x: 306, y: 252 },
  halq_wasat:      { x: 302, y: 222 },
  halq_adna:       { x: 296, y: 192 },
  lisan_aqsa_qaf:  { x: 272, y: 186 },
  lisan_aqsa_kaf:  { x: 250, y: 176 },
  lisan_wasat:     { x: 210, y: 166 },
  lisan_hafa:      { x: 186, y: 172 },
  lisan_lam:       { x: 156, y: 162 },
  lisan_nun:       { x: 142, y: 159 },
  lisan_ra:        { x: 132, y: 157 },
  lisan_nita:      { x: 120, y: 152 },
  lisan_safir:     { x: 114, y: 166 },
  lisan_lithawi:   { x: 106, y: 148 },
  shafatan_fa:     { x: 84,  y: 158 },
  shafatan_both:   { x: 76,  y: 144 },
  khayshum:        { x: 158, y: 78 }
};

export function diagram(activeZone = '', activePoint = '') {
  const on = (z) => (activeZone === z ? ' is-active' : '');
  const m = POINT_MARKERS[activePoint];

  return `
<svg class="makhraj-svg" viewBox="0 0 360 300" role="img"
     aria-label="Coupe schématique de la bouche et de la gorge, lèvres à gauche, gorge à droite">

  <!-- Profil, purement indicatif -->
  <path class="mk-face" d="M52 128 Q54 96 84 82 Q130 60 196 62 Q268 66 302 108
        Q330 142 326 190 Q322 246 296 282" />

  <!-- Fosses nasales -->
  <g class="mk-zone${on('khayshum')}" data-zone="khayshum" tabindex="0">
    <path class="mk-shape" d="M104 92 Q152 68 214 78 Q226 88 212 96
          Q158 104 106 100 Z" />
  </g>

  <!-- Cavité buccale : l'espace libre entre palais et langue -->
  <g class="mk-zone${on('jawf')}" data-zone="jawf" tabindex="0">
    <path class="mk-shape" d="M96 128 Q170 114 240 134 Q272 146 284 168
          Q244 178 178 172 Q130 166 98 156 Z" />
  </g>

  <!-- Palais -->
  <path class="mk-palate" d="M94 126 Q172 110 242 132 Q276 144 288 166" />

  <!-- Langue -->
  <g class="mk-zone${on('lisan')}" data-zone="lisan" tabindex="0">
    <path class="mk-shape" d="M100 162 Q168 150 238 166 Q276 176 288 196
          Q268 228 198 234 Q140 236 100 218 Z" />
  </g>

  <!-- Gorge -->
  <g class="mk-zone${on('halq')}" data-zone="halq" tabindex="0">
    <path class="mk-shape" d="M290 172 Q312 198 314 232 Q316 262 306 282
          L280 278 Q290 244 286 206 Q284 186 290 172 Z" />
  </g>

  <!-- Lèvres -->
  <g class="mk-zone${on('shafatan')}" data-zone="shafatan" tabindex="0">
    <path class="mk-shape" d="M62 124 Q84 118 94 128 Q98 138 94 148
          Q78 152 62 148 Z" />
    <path class="mk-shape" d="M62 156 Q78 152 94 156 Q98 166 94 176
          Q84 186 62 180 Z" />
  </g>

  <!-- Incisives -->
  <path class="mk-teeth" d="M100 130 L106 143 L96 143 Z M100 174 L106 161 L96 161 Z" />

  ${m ? `<g class="mk-marker">
           <circle cx="${m.x}" cy="${m.y}" r="14" class="mk-marker-halo" />
           <circle cx="${m.x}" cy="${m.y}" r="5.5" class="mk-marker-dot" />
         </g>` : ''}

  <text class="mk-label" x="44" y="112" text-anchor="end">lèvres</text>
  <text class="mk-label" x="180" y="256" text-anchor="middle">langue</text>
  <text class="mk-label" x="330" y="238">gorge</text>
  <text class="mk-label" x="160" y="62" text-anchor="middle">fosses nasales</text>
  <text class="mk-label" x="186" y="140" text-anchor="middle">cavité</text>
</svg>`;
}
