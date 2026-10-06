// src/tiles.js
export const T = Object.freeze({ EMPTY: 0, GROUND: 1, BRICK: 2, QBLOCK: 3, USED: 4, PIPE: 5, ONEWAY: 6 });

export function isSolid(t) {
  return t === T.GROUND || t === T.BRICK || t === T.QBLOCK || t === T.USED || t === T.PIPE;
}

export class TileMap {
  constructor(cols, rows, data = new Uint8Array(cols * rows), contents = new Map()) {
    this.cols = cols;
    this.rows = rows;
    this.data = data;
    this.contents = contents;
  }

  get(c, r) {
    if (c < 0 || c >= this.cols) return T.GROUND;
    if (r < 0 || r >= this.rows) return T.EMPTY;
    return this.data[r * this.cols + c];
  }

  set(c, r, t) {
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return;
    this.data[r * this.cols + c] = t;
  }

  peekContents(c, r) {
    return this.contents.get(`${c},${r}`) ?? null;
  }

  takeContents(c, r) {
    const key = `${c},${r}`;
    const value = this.contents.get(key) ?? null;
    this.contents.delete(key);
    return value;
  }
}
