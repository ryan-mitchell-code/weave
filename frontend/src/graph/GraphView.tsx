import { useEffect, useMemo } from 'react'
import ReactFlow, { useEdgesState, useNodesState } from 'reactflow'
import type { Edge, Node } from '../api/client'

import 'reactflow/dist/style.css'

export interface GraphViewProps {
  nodes: Node[]
  edges: Edge[]
  selectedNodeId?: string | null
  onNodeClick?: (nodeId: string) => void
  onPaneClick?: () => void
}

export function GraphView({
  nodes,
  edges,
  selectedNodeId = null,
  onNodeClick,
  onPaneClick,
}: GraphViewProps) {
  const flowNodes = useMemo(
    () =>
      nodes.map((node, index) => ({
        id: node.id,
        data: { label: `${node.name} (${node.type})` },
        position: {
          x: (index % 5) * 150,
          y: Math.floor(index / 5) * 100,
        },
        selected: node.id === selectedNodeId,
      })),
    [nodes, selectedNodeId],
  )

  const flowEdges = useMemo(
    () =>
      edges.map((edge) => ({
        id: edge.id,
        source: edge.from_id,
        target: edge.to_id,
        label: edge.type,
      })),
    [edges],
  )

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(flowNodes)
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(flowEdges)

  useEffect(() => {
    setRfNodes(flowNodes)
  }, [flowNodes, setRfNodes])

  useEffect(() => {
    setRfEdges(flowEdges)
  }, [flowEdges, setRfEdges])

  return (
    <div style={{ width: '100%', height: 420 }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onNodeClick?.(node.id)}
        onPaneClick={() => onPaneClick?.()}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag={true}
      />
    </div>
  )
}
