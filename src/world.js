// src/world.js
import { TILE } from './constants.js';
import { createCamera } from './camera.js';
import { Player } from './entities/player.js';
import { drawBackground, drawTiles } from './render.js';

export function createWorld({ level, session, audio }) {
  const world = {
    level,
    tiles: level.tiles,
    session,
    audio,
    camera: createCamera(level.cols * TILE),
    entities: [],
    bumps: [],
    player: null,
    spawn(entity) {
      world.entities.push(entity);
      return entity;
    },
  };
  world.player = new Player(level.start.col * TILE + 2, (level.start.row + 1) * TILE, session.power);
  world.camera.snapTo(world.player.body.x + world.player.body.w / 2);
  return world;
}

export function updateWorld(world, dt, input) {
  const { player, camera } = world;
  player.update(dt, world, input);
  camera.update(player.body.x + player.body.w / 2);
}

export function renderWorld(world, ctx, alpha) {
  const camX = world.camera.renderX(alpha);
  drawBackground(ctx);
  drawTiles(ctx, world.tiles, camX);
  world.player.render(ctx, world.camera, alpha);
}
