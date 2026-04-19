import { useState, useEffect } from 'react';
import ReactFlow, { Background, Controls, MiniMap, Edge, Node } from 'reactflow';
import 'reactflow/dist/style.css';
import { api } from '../lib/api';

export function SquadGraph({ executionId }: { executionId: string }) {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    useEffect(() => {
        if (!executionId) return;
        api.executions.get(executionId).then((snapshot) => {
            const newNodes = snapshot.pipeline.map((step, i) => ({
                id: step.stepId,
                position: { x: i * 250 + 50, y: 150 },
                data: { label: step.label },
                style: {
                    background: step.status === 'running' ? '#10b981' : step.status === 'completed' ? '#3b82f6' : step.status === 'failed' ? '#ef4444' : '#3f3f46',
                    color: '#fff',
                    border: step.status === 'running' ? '2px solid #34d399' : '1px solid #27272a',
                    borderRadius: 8,
                    padding: 10,
                },
                className: step.status === 'running' ? 'animate-pulse' : '',
            }));

            const newEdges = snapshot.pipeline.slice(0, -1).map((step, i) => ({
                id: `e-${step.stepId}-${snapshot.pipeline[i + 1].stepId}`,
                source: step.stepId,
                target: snapshot.pipeline[i + 1].stepId,
                animated: step.status === 'running' || snapshot.pipeline[i + 1].status === 'running',
                style: { stroke: '#10b981' }
            }));

            setNodes(newNodes);
            setEdges(newEdges);
        }).catch(console.error);
    }, [executionId]);

    return (
        <div style={{ height: '400px', width: '100%' }} className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
            <ReactFlow nodes={nodes} edges={edges} fitView>
                <Background gap={16} size={1} color="#27272a" />
                <Controls />
                <MiniMap nodeColor={(n) => n.style?.background as string || '#3f3f46'} maskColor="rgba(0,0,0,0.7)" />
            </ReactFlow>
        </div>
    );
}
