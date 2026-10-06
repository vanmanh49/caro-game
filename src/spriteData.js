// src/spriteData.js
export const PALETTE = {
  k: '#000000', w: '#fcfcfc', r: '#d82800', u: '#0058f8', s: '#f8b878', b: '#8c4a00',
  y: '#f8b800', o: '#e45c10', g: '#00a800', G: '#58d854', d: '#7c3000', l: '#fcd8a8', Y: '#f8f878',
};

const BIG_TOP = [
  '..rrrr..',
  '.rrrrrr.',
  '.sssbbs.',
  '.ssssss.',
  '..ssss..',
  '..rrrr..',
  '.rrrrrr.',
  '.ruuuur.',
  '.uuyyuu.',
  '.uuuuuu.',
];

const LEGS = {
  idle: ['.uuuuuu.', '.uuuuuu.', '.uu..uu.', '.uu..uu.', '.bb..bb.', 'bbb..bbb'],
  run1: ['.uuuuuu.', '..uuuuu.', '.uu..uu.', 'uu...uub', 'bb...bbb', 'bbb.....'],
  run2: ['.uuuuuu.', '.uuuuu..', '.uu..uu.', 'buu...uu', 'bbb...bb', '.....bbb'],
  jump: ['.uuuuuu.', 'uuuuuuuu', 'uu....uu', 'bb....bb', 'bbb..bbb', '........'],
};

const big = (legs) => [...BIG_TOP, ...legs];

export const SPRITES = {
  small_idle: ['..rrrr..', '.rrrrrr.', '.sssbbs.', '.ssssss.', '.ruuuur.', '.uuuuuu.', '.uu..uu.', '.bb..bb.'],
  small_run1: ['..rrrr..', '.rrrrrr.', '.sssbbs.', '.ssssss.', '.ruuuur.', '..uuuuu.', '.uu..bb.', 'bb...bbb'],
  small_run2: ['..rrrr..', '.rrrrrr.', '.sssbbs.', '.ssssss.', '.ruuuur.', '.uuuuu..', '.bb..uu.', 'bbb...bb'],
  small_jump: ['.rrrrrr.', 'rrrrrrrr', '.sssbbs.', '.ssssss.', 'suuuuuus', '.uuuuuu.', '.uu..uu.', '.bb..bb.'],

  big_idle: big(LEGS.idle),
  big_run1: big(LEGS.run1),
  big_run2: big(LEGS.run2),
  big_jump: big(LEGS.jump),

  goomba_a: ['..bbbb..', '.bbbbbb.', 'bwkbbkwb', 'bwwbbwwb', 'bbbbbbbb', '.bllllb.', '..ll.ll.', '.bb..bb.'],
  goomba_b: ['..bbbb..', '.bbbbbb.', 'bwkbbkwb', 'bwwbbwwb', 'bbbbbbbb', '.bllllb.', '.ll..ll.', 'bb....bb'],
  goomba_flat: ['........', '........', '........', '........', '........', '.bbbbbb.', 'bwkbbkwb', 'bbbbbbbb'],

  koopa_a: ['..ssss..', '..sksss.', '...ss...', '.gggggg.', 'gGgGgGgg', 'gGgGgGgg', '.gggggg.', '.ss..ss.'],
  koopa_b: ['..ssss..', '..sksss.', '...ss...', '.gggggg.', 'gGgGgGgg', 'gGgGgGgg', '.gggggg.', 'ss....ss'],
  koopa_shell: ['........', '........', '..gggg..', '.gGgGgg.', 'gGgGgGgg', 'gggggggg', '.wwwwww.', '..wwww..'],

  mushroom: ['..rrrr..', '.rwrrwr.', 'rwwrrwwr', 'rrrrrrrr', '.wwwwww.', '.wkwwkw.', '.wwwwww.', '..wwww..'],
  fireflower: ['..rooor.', '.roYYor.', '.roYYor.', '..rooor.', '...g....', '.g.gg.g.', '..gggg..', '...gg...'],
  coin_a: ['..yyyy..', '.yYYYYy.', '.yYyyYy.', '.yYyyYy.', '.yYyyYy.', '.yYyyYy.', '.yYYYYy.', '..yyyy..'],
  coin_b: ['...yy...', '..yYYy..', '..yYYy..', '..yYYy..', '..yYYy..', '..yYYy..', '..yYYy..', '...yy...'],
  fireball: ['.oo.', 'oyyo', 'oyyo', '.oo.'],
  debris: ['oobo', 'obbo', 'obbo', 'oobo'],
  flag: ['GGGGGGGG', 'GGGwwGGG', 'GGwwwwGG', '.GGwwGG.', '..GGGG..', '...GG...', '........', '........'],

  ground: ['GGGGGGGG', 'GGGGGGGG', 'dddddddd', 'dddodddd', 'dddddddd', 'ddddddod', 'dddddddd', 'dddddddd'],
  brick: ['oooooook', 'oooooook', 'oooooook', 'kkkkkkkk', 'ookooooo', 'ookooooo', 'ookooooo', 'kkkkkkkk'],
  qblock: ['yyyyyyyy', 'yowwwwoy', 'yowoowoy', 'yoooowoy', 'yooowooy', 'yooooooy', 'yooowooy', 'yyyyyyyy'],
  used: ['kkkkkkkk', 'kddddddk', 'kddddddk', 'kddddddk', 'kddddddk', 'kddddddk', 'kddddddk', 'kkkkkkkk'],
  pipe: ['kGGgggdk', 'kGGgggdk', 'kGGgggdk', 'kGGgggdk', 'kGGgggdk', 'kGGgggdk', 'kGGgggdk', 'kGGgggdk'],
  oneway: ['llllllll', 'dddddddd', '........', '........', '........', '........', '........', '........'],
};
