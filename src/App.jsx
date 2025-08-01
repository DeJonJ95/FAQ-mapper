import React, { useState, useRef, useEffect } from 'react';
import './App.css'; // Import the new stylesheet

// Helper function for generating unique IDs
const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// --- SVG Icons ---
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
);

// Draggable Node Component
const Node = ({ node, onUpdate, onAddChild, onDelete, onDragStart, onDrop, parentId, isRoot }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(node.text);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleTextClick = () => setIsEditing(true);
  const handleInputBlur = () => {
    setIsEditing(false);
    onUpdate(node.id, { text });
  };
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') handleInputBlur();
  };
  const handleContainerDragStart = (e) => {
    if (isEditing) {
      e.preventDefault();
      return;
    }
    onDragStart(e, node.id);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const nodeClasses = `node ${isRoot ? 'node-root' : ''}`;

  return (
    <div
      className={nodeClasses}
      draggable={!isEditing}
      onDragStart={handleContainerDragStart}
      onDrop={(e) => onDrop(e, node.id, parentId)}
      onDragOver={handleDragOver}
    >
      <div className="node-content">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="node-input"
          />
        ) : (
          <p className="node-text" onClick={handleTextClick}>
            {node.text}
          </p>
        )}
        <div className="node-controls">
          <button onClick={() => onAddChild(node.id)} className="node-button add-button">
            <PlusIcon />
            <span>Add</span>
          </button>
          <button onClick={() => onDelete(node.id)} className="node-button delete-button">
            <TrashIcon />
          </button>
        </div>
      </div>
      {node.children && node.children.length > 0 && (
        <div className="node-children">
          {node.children.map(child => (
            <Node
              key={child.id}
              node={child}
              onUpdate={onUpdate}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onDragStart={onDragStart}
              onDrop={onDrop}
              parentId={node.id}
              isRoot={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main App Component
const App = () => {
  const [nodes, setNodes] = useState([
    { id: generateId(), text: 'Caller Types', children: [
        { id: generateId(), text: 'Chairperson/Processing Issue', children: [] },
        { id: generateId(), text: 'EPI Processing or Computer Related Issues', children: [] },
        { id: generateId(), text: 'High Alert or Polling Location Issues', children: [] },
    ] }
  ]);
  const draggedNodeId = useRef(null);

  // State management and event handlers
  const findNodeAndParent = (id, currentNodes = nodes, parent = null) => {
    for (const node of currentNodes) {
      if (node.id === id) return { node, parent };
      if (node.children) {
        const found = findNodeAndParent(id, node.children, node);
        if (found) return found;
      }
    }
    return null;
  };

  const updateNode = (id, newProps) => {
    setNodes(prevNodes => {
      const newNodes = JSON.parse(JSON.stringify(prevNodes));
      const result = findNodeAndParent(id, newNodes);
      if (result) Object.assign(result.node, newProps);
      return newNodes;
    });
  };

  const addChildNode = (parentId) => {
    setNodes(prevNodes => {
      const newNodes = JSON.parse(JSON.stringify(prevNodes));
      const result = findNodeAndParent(parentId, newNodes);
      if (result) {
        const newNode = { id: generateId(), text: 'New Sub-Category', children: [] };
        result.node.children.push(newNode);
      }
      return newNodes;
    });
  };

  const deleteNode = (id) => {
    setNodes(prevNodes => {
      const newNodes = JSON.parse(JSON.stringify(prevNodes));
      const result = findNodeAndParent(id, newNodes);
      if (result) {
        const parentChildren = result.parent ? result.parent.children : newNodes;
        const index = parentChildren.findIndex(n => n.id === id);
        if (index > -1) parentChildren.splice(index, 1);
      }
      return newNodes;
    });
  };
  
  const handleDragStart = (e, id) => {
    draggedNodeId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };
  
  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggedNodeId.current;
    if (sourceId === targetId) return;

    setNodes(prevNodes => {
      const newNodes = JSON.parse(JSON.stringify(prevNodes));
      const sourceResult = findNodeAndParent(sourceId, newNodes);
      if (!sourceResult) return newNodes;
      
      const sourceParentChildren = sourceResult.parent ? sourceResult.parent.children : newNodes;
      const sourceIndex = sourceParentChildren.findIndex(n => n.id === sourceId);
      if (sourceIndex === -1) return newNodes;
      const [draggedNode] = sourceParentChildren.splice(sourceIndex, 1);

      const targetResult = findNodeAndParent(targetId, newNodes);
      if (targetResult) targetResult.node.children.push(draggedNode);
      else newNodes.push(draggedNode);
      return newNodes;
    });
    draggedNodeId.current = null;
  };
  
  const handleRootDrop = (e) => {
      e.preventDefault();
      const sourceId = draggedNodeId.current;
      if (!sourceId) return;
      
      setNodes(prevNodes => {
          const newNodes = JSON.parse(JSON.stringify(prevNodes));
          const sourceResult = findNodeAndParent(sourceId, newNodes);
          if(!sourceResult || !sourceResult.parent) return newNodes;

          const sourceParentChildren = sourceResult.parent.children;
          const sourceIndex = sourceParentChildren.findIndex(n => n.id === sourceId);
          if (sourceIndex === -1) return newNodes;
          const [draggedNode] = sourceParentChildren.splice(sourceIndex, 1);

          newNodes.push(draggedNode);
          return newNodes;
      });
      draggedNodeId.current = null;
  };

  return (
    <div 
      id="app-container" 
      onDrop={handleRootDrop} 
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={handleDragEnd}
    >
      <header id="app-header">
        <h1>FAQ & Ticket Category Mapper</h1>
        <p>Click text to edit. Drag cards to re-organize your support structure.</p>
      </header>
      <main>
        {nodes.map(node => (
          <Node
            key={node.id}
            node={node}
            onUpdate={updateNode}
            onAddChild={addChildNode}
            onDelete={deleteNode}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            parentId={null}
            isRoot={true}
          />
        ))}
      </main>
      <footer id="app-footer">
          <button 
              onClick={() => setNodes([...nodes, { id: generateId(), text: 'New Top-Level Category', children: [] }])}
              id="add-category-button"
          >
              Add Top-Level Category
          </button>
      </footer>
    </div>
  );
};

export default App;
