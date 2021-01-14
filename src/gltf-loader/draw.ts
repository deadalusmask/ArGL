import { vec3, mat4 } from 'gl-matrix'
import { IMesh, INode } from './interfaces'

const temp = mat4.create()
const normalMatrix = mat4.create()

export default (gl: WebGL2RenderingContext) => (
  node: INode,
  viewMatrix: mat4,
  projectionMatrix: mat4
) => {
  const mesh = node.mesh as IMesh
  const modelMatrix = node.tempMatrix
  mat4.invert(temp, modelMatrix)
  mat4.transpose(normalMatrix, temp)
  mesh.primitives.forEach((primitive, i) => {
    const shader = primitive.shader
    shader.use()
    primitive.material.textures.forEach((texture, i) => {
      gl.activeTexture(gl.TEXTURE0 + i)
      gl.bindTexture(gl.TEXTURE_2D, texture)
    })
    // TODO: may use cache
    primitive.material.uniforms.forEach(u => {
      shader.setUniform(u.name, u.type, u.value)
    })

    if (node.skin !== undefined /* && primitive.hasWeights && primitive.hasJoints */) {
      const skin = node.skin
      skin.jointMatrices.map((v, i) => {
        shader.setUniform(`u_jointMatrix`, 'MAT4', v)
        // shader.setUniform('u_jointNormalMatrix', 'MAT4', skin.jointNormalMatrices[i])
      })
    }

    shader.setUniform('u_ModelMatrix', 'MAT4', modelMatrix)
    shader.setUniform('u_ViewMatrix', 'MAT4', viewMatrix)
    shader.setUniform('u_ProjectionMatrix', 'MAT4', projectionMatrix)
    shader.setUniform('u_NormalMatrix', 'MAT4', normalMatrix)

    gl.bindVertexArray(primitive.vao)
    // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, primitive.indices)
    gl.drawElements(
      primitive.mode,
      primitive.indices.accessor.count,
      primitive.indices.accessor.componentType,
      0
    )
    gl.bindVertexArray(null)
  })
}
