import React, { useState, useRef, useEffect, useMemo } from 'react';
import './App.css';

// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, writeBatch, serverTimestamp, query, orderBy } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// --- Firebase Configuration (Provided by Environment) ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : { apiKey: "...", authDomain: "...", projectId: "...", storageBucket: "...", messagingSenderId: "...", appId: "..." };
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-faq-mapper';

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- SVG Icons ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const GripIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M144,60a12,12,0,1,1-12-12A12,12,0,0,1,144,60Zm-12,56a12,12,0,1,0,12,12A12,12,0,0,0,132,116Zm0,68a12,12,0,1,0,12,12A12,12,0,0,0,132,184Zm-56-56a12,12,0,1,0-12-12A12,12,0,0,0,76,128Zm0,68a12,12,0,1,0,12,12A12,12,0,0,0,76,196ZM88,60a12,12,0,1,0-12-12A12,12,0,0,0,88,60Z"></path></svg>;

// --- Components ---
const Node = ({ node, children, onUpdate, onAddChild, onDelete, onDragStart, onDragEnd, onDrop, onDragEnter, onDragLeave, draggingId, dropTargetId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(node.text);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleTextClick = () => setIsEditing(true);
  const handleInputBlur = () => {
    setIsEditing(false);
    if (text.trim() && text !== node.text) {
      onUpdate(node.id, { text });
    } else {
      setText(node.text);
    }
  };
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') handleInputBlur();
  };

  const isBeingDragged = node.id === draggingId;
  const isDropTarget = node.id === dropTargetId;
  const nodeClasses = `node ${node.parentId === '__root__' ? 'node-root' : ''} ${isBeingDragged ? 'is-dragging' : ''} ${isDropTarget ? 'drop-target-highlight' : ''}`;

  return (
    <div
      className={nodeClasses}
      onDrop={(e) => onDrop(e, node.id)}
      onDragEnter={(e) => onDragEnter(e, node.id)}
      onDragLeave={onDragLeave}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="node-content">
        <div 
          className="drag-handle"
          draggable={!isEditing}
          onDragStart={(e) => onDragStart(e, node.id)}
          onDragEnd={onDragEnd}
        >
          <GripIcon />
        </div>
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
      {children && children.length > 0 && (
        <div className="node-children">
          {children}
        </div>
      )}
    </div>
  );
};

const App = () => {
  const [nodes, setNodes] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const draggedNodeRef = useRef(null);

  useEffect(() => {
    // This listener will fire whenever the user's sign-in state changes.
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
        let firestoreUnsubscribe;

        if (user) {
            // User is signed in, set up the Firestore listener.
            const categoriesCol = collection(db, "apps", appId, "categories");
            const q = query(categoriesCol, orderBy("createdAt"));
            
            firestoreUnsubscribe = onSnapshot(q, (snapshot) => {
                const newNodes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setNodes(newNodes);
            }, (error) => {
                console.error("Firestore snapshot error:", error);
            });
        } else {
            // User is signed out. Try to sign them in.
            signInAnonymously(auth).catch(error => {
                console.error("Anonymous sign-in failed:", error);
            });
        }

        // When the auth state changes again (e.g., on logout),
        // clean up the previous Firestore listener before setting up a new one.
        return () => {
            if (firestoreUnsubscribe) {
                firestoreUnsubscribe();
            }
        };
    });

    // When the component unmounts, clean up the auth listener.
    return () => authUnsubscribe();
  }, []); // Empty dependency array means this effect runs only once on mount.

  const nodesMap = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes]);

  const handleDragStart = (e, id) => {
    e.stopPropagation();
    draggedNodeRef.current = id;
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTargetId(null);
    draggedNodeRef.current = null;
  };

  const handleDragEnter = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (id !== draggedNodeRef.current) {
      setDropTargetId(id);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetId(null);
  };

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetId(null);

    const sourceId = draggedNodeRef.current;
    if (!sourceId || sourceId === targetId) return;

    const isDescendant = (parentId, childId) => {
        let current = nodesMap.get(childId);
        while(current) {
            if (current.parentId === parentId) return true;
            current = nodesMap.get(current.parentId);
        }
        return false;
    };

    if (targetId !== '__root__' && isDescendant(sourceId, targetId)) {
        console.error("Action prevented: Cannot drop a category into its own child.");
        return;
    }
    
    const docRef = doc(db, "apps", appId, "categories", sourceId);
    await updateDoc(docRef, { parentId: targetId });
  };

  const updateNode = async (id, newProps) => {
    const docRef = doc(db, "apps", appId, "categories", id);
    await updateDoc(docRef, newProps);
  };

  const addChildNode = async (parentId) => {
    await addDoc(collection(db, "apps", appId, "categories"), {
        text: 'New Sub-Category',
        parentId: parentId,
        createdAt: serverTimestamp()
    });
  };

  const deleteNode = async (idToDelete) => {
    const batch = writeBatch(db);
    const allDescendants = new Set();
    const findDescendants = (parentId) => {
        const children = nodes.filter(n => n.parentId === parentId);
        for (const child of children) {
            allDescendants.add(child.id);
            findDescendants(child.id);
        }
    }
    findDescendants(idToDelete);

    batch.delete(doc(db, "apps", appId, "categories", idToDelete));
    allDescendants.forEach(descId => {
        batch.delete(doc(db, "apps", appId, "categories", descId));
    });

    await batch.commit();
  };
  
  const addTopLevelNode = async () => {
    await addDoc(collection(db, "apps", appId, "categories"), {
        text: 'New Top-Level Category',
        parentId: '__root__',
        createdAt: serverTimestamp()
    });
  };

  const buildTree = (parentId) => {
    return nodes
      .filter(node => node.parentId === parentId)
      .map(node => (
        <Node
          key={node.id}
          node={node}
          onUpdate={updateNode}
          onAddChild={addChildNode}
          onDelete={deleteNode}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          draggingId={draggingId}
          dropTargetId={dropTargetId}
        >
          {buildTree(node.id)}
        </Node>
      ));
  };

  return (
    <div id="app-container">
      <header id="app-header">
        <h1>FAQ & Ticket Category Mapper</h1>
        <p>Click text to edit. Use the handle to drag and re-organize categories.</p>
      </header>
      <main>
        {buildTree('__root__')}
        <div 
          id="root-drop-zone"
          className={dropTargetId === '__root__' ? 'drop-target-highlight' : ''}
          onDrop={(e) => handleDrop(e, '__root__')}
          onDragEnter={(e) => handleDragEnter(e, '__root__')}
          onDragLeave={handleDragLeave}
          onDragOver={(e) => e.preventDefault()}
        >
          Drop here to make a top-level category
        </div>
      </main>
      <footer id="app-footer">
          <button 
              onClick={addTopLevelNode}
              id="add-category-button"
          >
              Add Top-Level Category
          </button>
      </footer>
    </div>
  );
};

export default App;
