import ArcRotateCamera from './camera/ArcRotateCamera'
import UniversalCamera from './camera/UniversalCamera'
import DesktopInput from './input/DesktopInput'
import { vec3 } from 'gl-matrix'
// import loadGLTF from './gltf-loader/index'
// import createParticles from './particle/particle'
import axis from './axis/axis'
import sprite from './sprite'
import { mat4 } from 'gl-matrix'

const canvas = document.getElementById('main') as HTMLCanvasElement
canvas.height = window.innerHeight
canvas.width = window.innerWidth
const gl = canvas.getContext('webgl2', {
  premultipliedAlpha: true,
  // preserveDrawingBuffer: true,
  powerPreference: 'high-performance'
})
if (!gl) {
  throw new Error('webgl2 not available')
}
gl.viewport(0, 0, canvas.width, canvas.height)

gl.enable(gl.DEPTH_TEST)
gl.enable(gl.CULL_FACE)
gl.enable(gl.BLEND)
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

// TODO: read camera setting in glTF
const camera = new ArcRotateCamera(vec3.fromValues(0, 0, 0), Math.PI / 2, Math.PI / 2, 10)
// const camera = new UniversalCamera(vec3.fromValues(0, 0, 3), vec3.fromValues(0, 0, -1))
const di = new DesktopInput(canvas)

// const { json, scenes, render, animations } = await loadGLTF('/ybot.glb', gl)
// animations[0].play()

// const snow = await createParticles(gl, {
//   texture: './particle.png',
//   scale: 1,
//   numParticles: 1e4,
//   particleBirthRate: 500,
//   originA: [4, 3, -4],
//   originB: [-4, 3, 4],
//   angle: [0, -1, 0],
//   angleRadius: Math.PI / 4,
//   speedRange: [0.3, 0.6],
//   gravity: [0, 0, 0],
//   ageRange: [29, 30]
// })

const drawAxis = await axis(gl)

const scale = 3
const playerSprite = await sprite(gl, {
  texture: 'sprite/player-compat.png',
  atlas: 'sprite/player-compat.json',
  scale
})

playerSprite.setAnimation('run')
// const animations = playerSprite.animations
// let i = 0
// const ans = Object.keys(animations)
// const nextAnimation = () => {
//   i = (i + 1) % ans.length
//   // console.log(ans[i], animations[ans[i]])
//   playerSprite.setAnimation(ans[i])
//   setTimeout(nextAnimation, animations[ans[i]].duration)
// }
// setTimeout(nextAnimation, animations[ans[i]].duration)

const modelMatrix = mat4.create()
mat4.translate(modelMatrix, modelMatrix, [0, scale * 42, 0])
console.log(modelMatrix)

const getProjection = () => {
  // return camera.getProjectionMatrix(gl.canvas.width / gl.canvas.height, 0.001, 1000)
  return camera.getOrthographicProjectionMatrix(gl.canvas.width, gl.canvas.height, 0.01, 1000)
}

let projectionMatrix = getProjection()
gl.clearColor(0, 0, 0, 0)
const renderLoop = (time: number) => {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  if (window.innerHeight !== canvas.height || window.innerWidth !== canvas.width) {
    canvas.height = window.innerHeight
    canvas.width = window.innerWidth
    gl.viewport(0, 0, canvas.width, canvas.height)
    projectionMatrix = getProjection()
  }
  camera.processDesktopInput(di)
  drawAxis({ viewMatrix: camera.viewMatrix, projectionMatrix })
  // render(scenes[0], camera, time)

  playerSprite.render({ modelMatrix, viewMatrix: camera.viewMatrix, projectionMatrix, time })
  // snow({ time, viewMatrix: camera.viewMatrix, projectionMatrix })

  requestAnimationFrame(renderLoop)
}
requestAnimationFrame(renderLoop)
