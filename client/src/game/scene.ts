import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Camera } from "@babylonjs/core/Cameras/camera";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import { GameWorld } from "./GameWorld";

export interface GameHandle {
  scene: Scene;
  dispose: () => void;
  resize: () => void;
  setTheme: (theme: "light" | "dark") => void;
}

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement, theme: "light" | "dark"): Promise<GameHandle> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.965, 0.94, 0.90, 1);
  const camera = new FreeCamera("editorial-camera", new Vector3(0, 0, -10), scene);
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.setTarget(Vector3.Zero());
  scene.activeCamera = camera;

  const plane = MeshBuilder.CreatePlane("paper-stage", { size: 2 }, scene);
  const material = new StandardMaterial("paper-material", scene);
  material.disableLighting = true;
  material.backFaceCulling = false;
  material.emissiveColor = new Color3(1, 1, 1);
  plane.material = material;

  const world = new GameWorld(scene, canvas, plane, camera, theme);
  material.diffuseTexture = world.getTexture();
  material.opacityTexture = world.getTexture();
  scene.onBeforeRenderObservable.add(() => world.update(engine.getDeltaTime() / 1000));

  return {
    scene,
    dispose: () => {
      world.dispose();
      scene.dispose();
    },
    resize: () => world.resize(),
    setTheme: (t) => world.setTheme(t),
  };
}
