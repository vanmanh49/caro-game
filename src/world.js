// src/world.js
import { TILE } from './constants.js';
import { createCamera } from './camera.js';
import { Player } from './entities/player.js';
import { createFromSpawn } from './entities/index.js';
import { drawBackground, drawTiles } from './render.js';
import { resolveInteractions, isLive } from './interactions.js';
import { inActiveRange } from './camera.js';

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
  for (const spawn of level.spawns) world.spawn(createFromSpawn(spawn));
  return world;
}

export function updateWorld(world, dt, input) {
  const { player, camera } = world;
  if (player.state === 'dying') {
    player.update(dt, world, input);
    return;
  }
  player.update(dt, world, input);
  camera.update(player.body.x + player.body.w / 2);
  for (const e of world.entities) if (isLive(world, e)) e.update(dt, world);
  resolveInteractions(world);
  world.entities = world.entities.filter((e) => e.alive);
}

export function renderWorld(world, ctx, alpha) {
  const camX = world.camera.renderX(alpha);
  drawBackground(ctx);
  for (const e of world.entities) if (inActiveRange(world.camera, e.body)) e.render(ctx, world.camera, alpha);
  drawTiles(ctx, world.tiles, camX);
  world.player.render(ctx, world.camera, alpha);
}
