import { vec3, mat4 } from 'gl-matrix'
import { createShader } from '../shader'
import updateVsSource from './shader/updateVert'
import updateFsSource from './shader/update.frag'
import displayVsSource from './shader/display.vert'
import displayFsSource from './shader/display.frag'

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise(r => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => r(img)
    img.src = src
  })

export default async (gl: WebGL2RenderingContext, config: any) => {
  // TODO config check
  const {
    texture,
    numParticles,
    particleBirthRate,
    ageRange,
    angle,
    angleRadius,
    speedRange,
    gravity,
    originA,
    originB,
    scale
  } = config

  const particleImg = await loadImage(texture)
  const particleTex = (() => {
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      particleImg.naturalWidth,
      particleImg.naturalHeight,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      particleImg
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    return tex
  })()

  const initial_data = (() => {
    const singleParticleLength = 8
    const data = new Float32Array(singleParticleLength * numParticles)
    for (let i = 0; i < numParticles; i++) {
      // position
      data[i * singleParticleLength] = 1e10
      data[i * singleParticleLength + 1] = 1e10
      data[i * singleParticleLength + 2] = 1e10
      // velocity
      data[i * singleParticleLength + 3] = 0
      data[i * singleParticleLength + 4] = 0
      data[i * singleParticleLength + 5] = 0

      const life = ageRange[0] + Math.random() * (ageRange[1] - ageRange[0])
      // life
      data[i * singleParticleLength + 6] = life
      // age
      data[i * singleParticleLength + 7] = life + 1
    }
    return data
  })()

  let read = 0
  let write = 1
  const buffers = new Array(2).fill(0).map(_ => gl.createBuffer())
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers[0])
  gl.bufferData(gl.ARRAY_BUFFER, initial_data, gl.DYNAMIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers[1])
  gl.bufferData(gl.ARRAY_BUFFER, initial_data, gl.DYNAMIC_DRAW)

  const updatePass = (() => {
    const vaos = new Array(2).fill(0).map((_, i) => {
      const vao = gl.createVertexArray()
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i])

      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12)
      gl.enableVertexAttribArray(2)
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 24)
      gl.enableVertexAttribArray(3)
      gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 32, 28)

      gl.bindBuffer(gl.ARRAY_BUFFER, null)
      gl.bindVertexArray(null)
      return vao
    })

    const shader = createShader({
      gl,
      vs: updateVsSource({
        define: `#define SEED ${Math.floor(Math.random() * 1e6)}`
      }),
      fs: updateFsSource,
      transformFeedbackVaryings: ['v_Position', 'v_Velocity', 'v_Life', 'v_Age']
    })

    return () => {
      shader.use()
      shader.setUniform('u_Gravity', 'VEC3', gravity)
      shader.setUniform('u_OriginA', 'VEC3', originA)
      shader.setUniform('u_OriginB', 'VEC3', originB)
      shader.setUniform('u_Angle', 'VEC3', angle)
      shader.setUniform('u_AngleRadius', 'FLOAT', angleRadius)
      shader.setUniform('u_Speed', 'VEC2', speedRange)

      gl.bindVertexArray(vaos[read])
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buffers[write])
      gl.enable(gl.RASTERIZER_DISCARD)
      gl.beginTransformFeedback(gl.POINTS)
      gl.drawArrays(gl.POINTS, 0, bornParticles)
      gl.endTransformFeedback()
      gl.disable(gl.RASTERIZER_DISCARD)
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null)
    }
  })()
  const displayPass = (() => {
    const vaos = new Array(2).fill(0).map((v, i) => {
      const vao = gl.createVertexArray()
      gl.bindVertexArray(vao)

      gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i])
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0)
      gl.vertexAttribDivisor(0, 1)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12)
      gl.vertexAttribDivisor(1, 1)
      gl.enableVertexAttribArray(2)
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 24)
      gl.vertexAttribDivisor(2, 1)
      gl.enableVertexAttribArray(3)
      gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 32, 28)
      gl.vertexAttribDivisor(3, 1)

      const quad = [-1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, -1.0]
      const quadBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quad), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(4)
      gl.vertexAttribPointer(4, 2, gl.FLOAT, true, 8, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
      gl.bindVertexArray(null)
      return vao
    })
    const shader = createShader({
      gl,
      vs: displayVsSource,
      fs: displayFsSource
    })
    return ({ viewMatrix, projectionMatrix }: { viewMatrix: mat4; projectionMatrix: mat4 }) => {
      gl.bindVertexArray(vaos[read])
      shader.use()
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, particleTex)
      shader.setUniform('u_Sprite', 'INT', 0)
      shader.setUniform('u_Size', 'VEC2', [
        (scale * particleImg.naturalWidth) / 1000,
        (scale * particleImg.naturalHeight) / 1000
      ])
      shader.setUniform('u_ViewMatrix', 'MAT4', viewMatrix)
      shader.setUniform('u_ProjectionMatrix', 'MAT4', projectionMatrix)
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, bornParticles)
    }
  })()

  let bornParticles = 0
  // 兼容单帧新增数小于1的情况
  let increaseFloat = 0
  let increaseTemp = 0

  const renderLoop = ({
    time,
    viewMatrix,
    projectionMatrix
  }: {
    time: number
    viewMatrix: mat4
    projectionMatrix: mat4
  }) => {
    increaseFloat += particleBirthRate / 60
    const increase = Math.floor(increaseFloat) - increaseTemp
    if (increase > 0) {
      increaseFloat -= increase
      increaseTemp = 0
    }

    bornParticles = Math.min(numParticles, bornParticles + increase)
    if (bornParticles > 0) {
      updatePass()
      displayPass({ viewMatrix, projectionMatrix })
    }
    read = (read + 1) % 2
    write = (write + 1) % 2
  }
  return renderLoop
}
