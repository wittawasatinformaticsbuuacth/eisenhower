import { useState, useEffect, useRef } from "react";
import {
  FacebookAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const QS = [
  {
    id: "do",
    label: "Do First",
    sub: "Urgent · Important",
    bg: "var(--q1-bg)",
    color: "var(--q1)",
  },
  {
    id: "schedule",
    label: "Schedule",
    sub: "Not Urgent · Important",
    bg: "var(--q2-bg)",
    color: "var(--q2)",
  },
  {
    id: "delegate",
    label: "Delegate",
    sub: "Urgent · Not Important",
    bg: "var(--q3-bg)",
    color: "var(--q3)",
  },
  {
    id: "drop",
    label: "Eliminate",
    sub: "Not Urgent · Not Important",
    bg: "var(--q4-bg)",
    color: "var(--q4)",
  },
];

const TICK = (
  <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
    <path
      d="M1 3.5l1.8 1.8 3.2-3.2"
      stroke="white"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getDueDateStatus = (dateStr) => {
  if (!dateStr) return "none";
  const due = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "due-soon";
  return "normal";
};

function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async () => {
    setLoading(true);
    setError("");
    try {
      const provider = new FacebookAuthProvider();
      provider.addScope("public_profile");
      await signInWithPopup(auth, provider);
    } catch (e) {
      setError("Sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="login-card">
        <h1>Eisenhower Matrix</h1>
        <p className="login-sub">Prioritize what matters.</p>
        <button className="fb-btn" onClick={login} disabled={loading}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
          </svg>
          {loading ? "Connecting…" : "Continue with Facebook"}
        </button>
        {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  );
}

function Quadrant({
  q,
  tasks,
  uid,
  activeQ,
  val,
  inputRef,
  onOpen,
  onVal,
  onCommit,
  allQuadrants,
  onMove,
  statusFilter,
  dueDate,
  onDueDateChange,
  dueDateRef,
}) {
  const qTasks = tasks
    .filter((t) => t.q === q.id)
    .filter((t) => {
      if (statusFilter === "done") return t.done;
      if (statusFilter === "pending") return !t.done;
      return true;
    })
    .sort((a, b) => {
      if (a.done !== b.done) return a.done - b.done;
      const aDate = a.dueDate ? new Date(a.dueDate) : new Date("2099-12-31");
      const bDate = b.dueDate ? new Date(b.dueDate) : new Date("2099-12-31");
      return aDate - bDate;
    });
  const pending = tasks.filter((t) => t.q === q.id && !t.done).length;
  const isActive = activeQ === q.id;
  const [editingDateTask, setEditingDateTask] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [editDateValue, setEditDateValue] = useState("");
  const [expandedNoteTask, setExpandedNoteTask] = useState(null);
  const [editingNoteTask, setEditingNoteTask] = useState(null);
  const [editNoteValue, setEditNoteValue] = useState("");

  const toggle = (task) =>
    updateDoc(doc(db, "users", uid, "tasks", task.id), { done: !task.done });

  const del = (e, task) => {
    e.stopPropagation();
    deleteDoc(doc(db, "users", uid, "tasks", task.id));
  };

  const moveTask = (taskId, newQuadrant) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.q !== newQuadrant) {
      updateDoc(doc(db, "users", uid, "tasks", taskId), { q: newQuadrant });
    }
  };

  const handleDragStart = (e, task) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("taskId", task.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const taskId = e.dataTransfer.getData("taskId");
    moveTask(taskId, q.id);
  };

  const updateTaskDueDate = (e, task) => {
    e.stopPropagation();
    setEditingDateTask(task.id);
    setEditDateValue(task.dueDate || "");
  };

  const saveDueDate = () => {
    if (editingDateTask) {
      if (editDateValue === "") {
        updateDoc(doc(db, "users", uid, "tasks", editingDateTask), {
          dueDate: null,
        });
      } else {
        updateDoc(doc(db, "users", uid, "tasks", editingDateTask), {
          dueDate: editDateValue,
        });
      }
      setEditingDateTask(null);
      setEditDateValue("");
    }
  };

  const startEditingNote = (e, task) => {
    e.stopPropagation();
    setEditingNoteTask(task.id);
    setEditNoteValue(task.notes || "");
  };

  const saveNote = (taskId) => {
    updateDoc(doc(db, "users", uid, "tasks", taskId), {
      notes: editNoteValue.trim() || null,
    });
    setEditingNoteTask(null);
    setEditNoteValue("");
  };

  const deleteNote = (taskId) => {
    updateDoc(doc(db, "users", uid, "tasks", taskId), {
      notes: null,
    });
    setExpandedNoteTask(null);
    setEditingNoteTask(null);
    setEditNoteValue("");
  };

  return (
    <div className="q" style={{ background: q.bg, color: q.color }}>
      <div className="q-head" style={{ background: q.bg }}>
        <div>
          <div className="q-name">{q.label}</div>
          <div className="q-sub">{q.sub}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {pending > 0 && <span className="q-count">{pending}</span>}
          <button
            className="add-btn"
            style={{ color: q.color }}
            onClick={() => onOpen(q.id)}
          >
            +
          </button>
        </div>
      </div>

      <div
        className={`tasks${dragOver ? " drag-over" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isActive) {
            onOpen(q.id);
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ cursor: !isActive ? "pointer" : "default" }}
      >
        {qTasks.map((task) => (
          <div key={task.id}>
            <div
              className={`task${task.done ? " done" : ""}`}
              style={{ color: q.color, position: "relative" }}
              draggable
              onDragStart={(e) => handleDragStart(e, task)}
            >
              <div
                className="check"
                onClick={() => toggle(task)}
                style={{ cursor: "pointer" }}
              >
                {task.done && TICK}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    className="task-text"
                    style={{ color: "var(--text)", cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!task.notes) {
                        setExpandedNoteTask(task.id);
                        setEditingNoteTask(task.id);
                        setEditNoteValue("");
                      } else {
                        setExpandedNoteTask(
                          expandedNoteTask === task.id ? null : task.id,
                        );
                      }
                    }}
                    title={
                      task.notes
                        ? "Click to toggle notes"
                        : "Click to add notes"
                    }
                  >
                    {task.text}
                  </span>
                  {task.notes && <span style={{ fontSize: "0.8rem" }}>📄</span>}
                </div>
                {expandedNoteTask === task.id && (
                  <div className="task-notes-display">
                    {editingNoteTask === task.id ? (
                      <textarea
                        className="task-notes-editor"
                        value={editNoteValue}
                        onChange={(e) => setEditNoteValue(e.target.value)}
                        placeholder="Add notes…"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setEditingNoteTask(null);
                            setEditNoteValue("");
                          }
                        }}
                      />
                    ) : (
                      <div
                        className="task-notes-content"
                        onClick={(e) => startEditingNote(e, task)}
                      >
                        {task.notes}
                      </div>
                    )}
                    {editingNoteTask === task.id && (
                      <div className="task-notes-buttons">
                        <button
                          className="notes-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNote(task.id);
                          }}
                        >
                          Delete
                        </button>
                        <button
                          className="notes-cancel"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedNoteTask(null);
                            setEditingNoteTask(null);
                            setEditNoteValue("");
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          className="notes-save"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveNote(task.id);
                          }}
                          style={{ backgroundColor: q.color, color: "white" }}
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="task-actions">
                {task.dueDate ? (
                  <button
                    className={`task-date task-date-${getDueDateStatus(task.dueDate)}`}
                    onClick={(e) => updateTaskDueDate(e, task)}
                    title="Click to edit due date"
                  >
                    {formatDate(task.dueDate)}
                  </button>
                ) : (
                  <button
                    className="date-btn"
                    onClick={(e) => updateTaskDueDate(e, task)}
                    title="Click to add due date"
                  >
                    📅
                  </button>
                )}
                <button className="del-btn" onClick={(e) => del(e, task)}>
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}

        {isActive && (
          <div
            className="task-input-wrapper"
            style={{ borderBottomColor: q.color }}
          >
            <input
              ref={inputRef}
              className="task-input"
              value={val}
              placeholder="Type task, Enter to save…"
              onChange={(e) => onVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onCommit(q.id, true);
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  onCommit(null);
                }
              }}
              onBlur={() => onCommit(q.id)}
            />
            <input
              ref={dueDateRef}
              type="date"
              className="task-date-input"
              value={dueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
              style={{ borderBottomColor: q.color }}
            />
          </div>
        )}
      </div>

      {editingDateTask && (
        <div className="date-picker-modal">
          <div className="date-picker-content" style={{ borderColor: q.color }}>
            <h3 style={{ color: q.color }}>Set Due Date</h3>
            <input
              type="date"
              value={editDateValue}
              onChange={(e) => setEditDateValue(e.target.value)}
              autoFocus
              className="date-picker-input"
            />
            <div className="date-picker-buttons">
              <button
                className="date-picker-clear"
                onClick={() => setEditDateValue("")}
              >
                Clear
              </button>
              <button
                className="date-picker-cancel"
                onClick={() => {
                  setEditingDateTask(null);
                  setEditDateValue("");
                }}
              >
                Cancel
              </button>
              <button
                className="date-picker-save"
                onClick={saveDueDate}
                style={{ backgroundColor: q.color }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Matrix({ user }) {
  const [tasks, setTasks] = useState([]);
  const [activeQ, setActiveQ] = useState(null);
  const [val, setVal] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [fontSize, setFontSize] = useState(
    () => Number(localStorage.getItem("em-fs")) || 20,
  );
  const [fontFamily, setFontFamily] = useState(
    () => localStorage.getItem("em-font") || "Fira Code",
  );
  const inputRef = useRef(null);
  const dueDateRef = useRef(null);

  useEffect(() => {
    document.documentElement.style.fontSize = fontSize + "px";
    localStorage.setItem("em-fs", fontSize);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--font-family",
      `'${fontFamily}'`,
    );
    localStorage.setItem("em-font", fontFamily);
  }, [fontFamily]);

  const adjustFont = (d) =>
    setFontSize((f) => Math.min(30, Math.max(12, f + d)));

  useEffect(() => {
    const q = query(
      collection(db, "users", user.uid, "tasks"),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(q, (snap) =>
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
  }, [user.uid]);

  useEffect(() => {
    if (activeQ) inputRef.current?.focus();
  }, [activeQ]);

  const openInput = (qid) => {
    setActiveQ(qid);
    setVal("");
    setDueDate("");
  };

  const commit = (qid, keepOpen = false) => {
    if (qid && val.trim()) {
      addDoc(collection(db, "users", user.uid, "tasks"), {
        text: val.trim(),
        q: qid,
        done: false,
        dueDate: dueDate || null,
        notes: null,
        createdAt: serverTimestamp(),
      });
    }
    setVal("");
    setDueDate("");
    if (!keepOpen) {
      setActiveQ(null);
    } else {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const qProps = (q) => ({
    q,
    tasks,
    uid: user.uid,
    activeQ,
    val,
    inputRef,
    onOpen: openInput,
    onVal: setVal,
    onCommit: commit,
    allQuadrants: QS,
    statusFilter,
    dueDate,
    onDueDateChange: setDueDate,
    dueDateRef,
  });

  return (
    <div className="app">
      <header>
        <h1>Eisenhower Matrix</h1>
        <span className="date">{today}</span>
        <div className="header-right">
          <div className="filter-btns">
            <button
              className={statusFilter === "all" ? "active" : ""}
              onClick={() => setStatusFilter("all")}
            >
              All
            </button>
            <button
              className={statusFilter === "pending" ? "active" : ""}
              onClick={() => setStatusFilter("pending")}
            >
              Pending
            </button>
            <button
              className={statusFilter === "done" ? "active" : ""}
              onClick={() => setStatusFilter("done")}
            >
              Done
            </button>
          </div>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            style={{
              padding: "2px 2px",
              borderRadius: "5px",
              border: "1px solid #666",
              fontSize: "0.72rem",
              fontFamily: fontFamily,
            }}
          >
            <option value="Fira Code">Fira Code</option>
            <option value="JetBrains Mono">JetBrains Mono</option>
            <option value="IBM Plex Mono">IBM Plex Mono</option>
            <option value="Outfit">Outfit</option>
            <option value="Sarabun">Sarabun</option>
          </select>
          <div className="font-btns">
            <button onClick={() => adjustFont(-2)} disabled={fontSize <= 12}>
              A−
            </button>
            <button onClick={() => adjustFont(+2)} disabled={fontSize >= 30}>
              A+
            </button>
          </div>
          {user.photoURL && (
            <img src={user.photoURL} alt="" className="avatar" />
          )}
          {/* <span className="user-name">{user.displayName}</span> */}
          <button className="logout-btn" onClick={() => signOut(auth)}>
            Log out
          </button>
        </div>
      </header>

      <div className="matrix-grid">
        <div />
        <div className="ax">Urgent</div>
        <div className="ax">Not Urgent</div>
        <div className="ax ax-y">Important</div>
        <Quadrant {...qProps(QS[0])} />
        <Quadrant {...qProps(QS[1])} />
        <div className="ax ax-y">Not Important</div>
        <Quadrant {...qProps(QS[2])} />
        <Quadrant {...qProps(QS[3])} />
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  if (user === undefined) return null;
  if (!user) return <Login />;
  return <Matrix user={user} />;
}
