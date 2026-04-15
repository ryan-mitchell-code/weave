import { memo, useMemo } from 'react'
import { BaseEdge, type EdgeProps } from 'reactflow'

export type CustomEdgeData = {
  offset: number
}

function CustomEdge(props: EdgeProps<CustomEdgeData>) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
    markerEnd,
    markerStart,
    style,
    label,
    labelStyle,
    labelShowBg,
    labelBgStyle,
    labelBgPadding,
    labelBgBorderRadius,
    interactionWidth,
  } = props

  const offset = data?.offset ?? 0

  const { path, labelX, labelY } = useMemo(() => {
    const dx = targetX - sourceX
    const dy = targetY - sourceY
    const len = Math.hypot(dx, dy) || 1
    const tx = dx / len
    const ty = dy / len
    const nx = -ty
    const ny = tx
    const cx = (sourceX + targetX) / 2 + nx * offset
    const cy = (sourceY + targetY) / 2 + ny * offset
    const d = `M${sourceX},${sourceY} Q${cx},${cy} ${targetX},${targetY}`
    const lx = 0.25 * sourceX + 0.5 * cx + 0.25 * targetX
    const ly = 0.25 * sourceY + 0.5 * cy + 0.25 * targetY
    // Push labels away from the chord and stagger along flow so parallels don't stack.
    const alongNormal = offset * 0.32
    const alongChord = offset * 0.1
    const labelXOut = lx + nx * alongNormal + tx * alongChord
    const labelYOut = ly + ny * alongNormal + ty * alongChord
    return { path: d, labelX: labelXOut, labelY: labelYOut }
  }, [sourceX, sourceY, targetX, targetY, offset])

  return (
    <BaseEdge
      id={id}
      path={path}
      labelX={labelX}
      labelY={labelY}
      label={label}
      labelStyle={labelStyle}
      labelShowBg={labelShowBg}
      labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding ?? ([8, 4] as [number, number])}
      labelBgBorderRadius={labelBgBorderRadius}
      markerEnd={markerEnd}
      markerStart={markerStart}
      style={style}
      interactionWidth={interactionWidth}
    />
  )
}

export default memo(CustomEdge)
