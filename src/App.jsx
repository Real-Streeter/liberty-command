import { useState, useEffect, useCallback } from 'react';
import { LIMITS, validateTask, validateRfp, validateUser } from './lib/validation.js';
import { api } from './lib/api.js';
import LoginPage from './components/LoginPage.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ClipboardList, PlusCircle,
  BarChart3, Settings, LogOut,
  Package, DollarSign, Truck, Code, Camera, Ship,
  MessageSquare, Clock, Search, Calendar, AlertCircle, X, Edit2
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Map icon name strings from the API to Lucide components
const iconMap = { Package, DollarSign, Truck, Code, Camera, Ship, MessageSquare, Clock };

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [view, setView] = useState('board');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data from API
  const [columns, setColumns] = useState([]);
  const [rfps, setRfps] = useState([]);
  const [users, setUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showRfpModal, setShowRfpModal] = useState(false);
  const [editingRfp, setEditingRfp] = useState(null);

  // Check auth on mount
  useEffect(() => {
    api.me()
      .then(user => setCurrentUser(user))
      .catch(() => setCurrentUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  // Load all data when authenticated
  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [cols, rfpData, teamData] = await Promise.all([
        api.getColumns(),
        api.getRfps(),
        api.getTeam(),
      ]);
      // Map icon strings to components
      setColumns(cols.map(col => ({ ...col, icon: iconMap[col.icon] || Package })));
      setRfps(rfpData);
      setUsers(teamData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { loadData(); }, [loadData]);

  // Show login page if not authenticated
  if (!authChecked) {
    return <div className="min-h-screen bg-[#030508] flex items-center justify-center"><div className="text-zinc-500 text-sm">Loading...</div></div>;
  }
  if (!currentUser) {
    return <LoginPage onLogin={(user) => setCurrentUser(user)} />;
  }

  if (loading) {
    return <div className="min-h-screen bg-[#030508] flex items-center justify-center"><div className="text-zinc-500 text-sm">Loading data...</div></div>;
  }

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
  };

  const addTask = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const error = validateTask(fd);
    if (error) { setFormError(error); return; }
    setFormError(null);

    const taskData = {
      content: fd.get('task'),
      owner: fd.get('owner'),
      tag: fd.get('tag'),
      priority: fd.get('priority'),
      est: fd.get('estimate') || null,
      dueDate: fd.get('dueDate') || null,
    };

    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, taskData);
      } else {
        await api.createTask(taskData);
      }
      await loadData();
    } catch (err) {
      setFormError(err.message);
      return;
    }

    setShowModal(false);
    setEditingTask(null);
  };

  const editTask = (task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const deleteTask = async (taskId) => {
    setColumns(prev => prev.map(col => ({ ...col, tasks: col.tasks.filter(t => t.id !== taskId) })));
    try { await api.deleteTask(taskId); } catch { await loadData(); }
  };

  // RFP Functions
  const addOrUpdateRfp = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const error = validateRfp(fd);
    if (error) { setFormError(error); return; }
    setFormError(null);

    const rfpData = {
      name: fd.get('name'),
      carrier: fd.get('carrier'),
      progress: parseInt(fd.get('progress')),
      status: fd.get('status'),
      dueDate: fd.get('dueDate') || null,
      notes: fd.get('notes') || '',
    };

    try {
      if (editingRfp) {
        await api.updateRfp(editingRfp.id, rfpData);
      } else {
        await api.createRfp(rfpData);
      }
      await loadData();
    } catch (err) {
      setFormError(err.message);
      return;
    }

    setShowRfpModal(false);
    setEditingRfp(null);
  };

  const editRfp = (rfp) => {
    setEditingRfp(rfp);
    setShowRfpModal(true);
  };

  const deleteRfp = async (rfpId) => {
    setRfps(prev => prev.filter(rfp => rfp.id !== rfpId));
    try { await api.deleteRfp(rfpId); } catch { await loadData(); }
  };

  // User Functions
  const addOrUpdateUser = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const error = validateUser(fd);
    if (error) { setFormError(error); return; }
    setFormError(null);

    const userData = { name: fd.get('name'), color: fd.get('color') };

    try {
      if (editingUser) {
        await api.updateMember(editingUser.id, userData);
      } else {
        await api.createMember(userData);
      }
      await loadData();
    } catch (err) {
      setFormError(err.message);
      return;
    }

    setShowUserModal(false);
    setEditingUser(null);
  };

  const editUser = (user) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  const deleteUser = async (userId) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
    try { await api.deleteMember(userId); } catch { await loadData(); }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeColumn = findColumn(activeId);
    const overColumn = findColumn(overId);

    if (!activeColumn || !overColumn) return;

    if (activeColumn !== overColumn) {
      setColumns((columns) => {
        const activeItems = activeColumn.tasks;
        const overItems = overColumn.tasks;

        const activeIndex = activeItems.findIndex((i) => i.id === activeId);
        const overIndex = overItems.findIndex((i) => i.id === overId);

        let newIndex;
        if (overId in columns.reduce((acc, col) => ({ ...acc, [col.id]: col }), {})) {
          newIndex = overItems.length + 1;
        } else {
          const isBelowOverItem =
            over &&
            active.rect.current.translated &&
            active.rect.current.translated.top > over.rect.top + over.rect.height;
          const modifier = isBelowOverItem ? 1 : 0;
          newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
        }

        return columns.map((col) => {
          if (col.id === activeColumn.id) {
            return {
              ...col,
              tasks: activeItems.filter((item) => item.id !== activeId),
            };
          } else if (col.id === overColumn.id) {
            return {
              ...col,
              tasks: [
                ...overItems.slice(0, newIndex),
                activeItems[activeIndex],
                ...overItems.slice(newIndex, overItems.length),
              ],
            };
          } else {
            return col;
          }
        });
      });
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    const activeColumn = findColumn(activeId);
    const overColumn = findColumn(overId);

    if (!activeColumn || !overColumn) {
      setActiveId(null);
      return;
    }

    const activeIndex = activeColumn.tasks.findIndex((i) => i.id === activeId);
    const overIndex = overColumn.tasks.findIndex((i) => i.id === overId);

    if (activeIndex !== overIndex && activeColumn === overColumn) {
      setColumns((columns) => {
        return columns.map((col) => {
          if (col.id === activeColumn.id) {
            return {
              ...col,
              tasks: arrayMove(col.tasks, activeIndex, overIndex),
            };
          }
          return col;
        });
      });
    }

    // Persist reorder to API
    const moves = [];
    columns.forEach(col => {
      col.tasks.forEach((task, idx) => {
        moves.push({ taskId: task.id, columnId: col.id, sortOrder: idx });
      });
    });
    api.reorderTasks(moves).catch(() => loadData());

    setActiveId(null);
  };

  const findColumn = (id) => {
    if (id in columns.reduce((acc, col) => ({ ...acc, [col.id]: col }), {})) {
      return columns.find((col) => col.id === id);
    }
    return columns.find((col) => col.tasks.some((task) => task.id === id));
  };

  // Filter columns based on search query
  const filteredColumns = columns.map(col => ({
    ...col,
    tasks: col.tasks.filter(task =>
      searchQuery === '' ||
      task.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.tag.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }));

  const activeTask = activeId ? columns.flatMap(col => col.tasks).find(task => task.id === activeId) : null;

  return (
    <div className="min-h-screen bg-[#030508] text-slate-300 font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col md:flex-row">

      {/* TACTICAL SIDEBAR - Desktop */}
      <aside className="hidden md:flex w-20 border-r border-white/5 bg-black/40 flex-col items-center py-8 gap-10 backdrop-blur-2xl z-50">
        <div className="w-12 h-12 bg-gradient-to-br from-zinc-700 to-zinc-900 rounded-2xl flex items-center justify-center shadow-lg shadow-black/40 border border-white/10">
          <span className="text-white font-black italic text-xl">L</span>
        </div>

        <nav className="flex flex-col gap-6">
          <NavIcon icon={<ClipboardList size={22} />} active={view === 'board'} onClick={() => setView('board')} label="Board" />
          <NavIcon icon={<LayoutDashboard size={22} />} active={view === 'dashboard'} onClick={() => setView('dashboard')} label="RFP" />
          <NavIcon icon={<BarChart3 size={22} />} active={view === 'analytics'} onClick={() => setView('analytics')} label="Analytics" />
          <NavIcon icon={<Calendar size={22} />} active={view === 'calendar'} onClick={() => setView('calendar')} label="Calendar" />
        </nav>

        <div className="mt-auto pb-4 flex flex-col gap-4">
          <NavIcon icon={<Settings size={20} />} active={view === 'settings'} onClick={() => setView('settings')} label="Settings" />
          <NavIcon icon={<LogOut size={20} />} active={false} onClick={handleLogout} label="Logout" />
        </div>
      </aside>

      {/* MAIN COMMAND AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden pb-20 md:pb-0">
        <header className="px-4 md:px-10 pt-6 md:pt-10 pb-4 md:pb-6 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 md:gap-0 mb-4 md:mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/80">HIFA Launch Active</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter">
                Liberty <span className="text-zinc-400">Command</span>
              </h1>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="hidden md:flex group relative items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 rounded-xl font-bold text-xs transition-all hover:scale-105 hover:from-blue-500 hover:to-blue-400 active:scale-95 shadow-lg shadow-blue-900/50"
            >
              <PlusCircle size={16} />
              <span>NEW MISSION</span>
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              placeholder="Filter by owner, task, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-3 rounded-xl text-sm text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-zinc-700"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors text-xs font-bold"
              >
                CLEAR
              </button>
            )}
          </div>
        </header>

        <section className="flex-1 overflow-x-auto px-4 md:px-10 py-4 custom-scrollbar">
          {view === 'board' ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 md:gap-6 h-full items-start snap-x snap-mandatory md:snap-none overflow-x-auto md:overflow-x-visible -mx-4 md:mx-0 px-4 md:px-0">
                {filteredColumns.map(col => (
                  <Column key={col.id} column={col} onEditTask={editTask} onDeleteTask={deleteTask} />
                ))}
              </div>
              <DragOverlay>
                {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
              </DragOverlay>
            </DndContext>
          ) : view === 'dashboard' ? (
            <div className="max-w-5xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-white uppercase italic">RFP Management</h2>
                <button
                  onClick={() => setShowRfpModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all hover:scale-105"
                >
                  <PlusCircle size={14} />
                  <span>NEW RFP</span>
                </button>
              </div>
              {rfps.map(rfp => (
                <RFPItem key={rfp.id} rfp={rfp} onEdit={editRfp} onDelete={deleteRfp} />
              ))}
              {rfps.length === 0 && (
                <div className="text-center py-20 text-zinc-600">
                  <p className="text-sm">No RFPs yet. Click "NEW RFP" to get started.</p>
                </div>
              )}
            </div>
          ) : view === 'analytics' ? (
            <AnalyticsView columns={columns} rfps={rfps} />
          ) : view === 'calendar' ? (
            <CalendarView columns={columns} />
          ) : (
            <SettingsView users={users} onEditUser={editUser} onDeleteUser={deleteUser} onAddUser={() => setShowUserModal(true)} />
          )}
        </section>
      </main>

      {/* NEW MISSION MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-0 md:p-6">
            <motion.form
              onSubmit={addTask}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a0c10] border-0 md:border border-white/10 p-6 md:p-10 rounded-none md:rounded-[2.5rem] w-full h-full md:h-auto max-w-full md:max-w-lg shadow-2xl relative overflow-auto md:overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-500 to-transparent" />
              <h2 className="text-2xl font-black text-white italic uppercase mb-8 tracking-tighter">{editingTask ? 'Edit Task' : 'Deploy Task'}</h2>

              {formError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-bold">{formError}</div>}

              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Task Description</label>
                  <input name="task" defaultValue={editingTask?.content || ''} maxLength={LIMITS.TASK_CONTENT} placeholder="e.g. Confirm reefer capacity for MI-48047" required className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white focus:border-zinc-400 outline-none transition-all placeholder:text-zinc-700" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Owner</label>
                    <select name="owner" defaultValue={editingTask?.owner || ''} required className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white focus:border-zinc-400 outline-none appearance-none">
                      {users.map(user => (
                        <option key={user.id} className="bg-zinc-900" value={user.name}>{user.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Estimate</label>
                    <input name="estimate" defaultValue={editingTask?.est || ''} maxLength={LIMITS.ESTIMATE} placeholder="2d" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white focus:border-zinc-400 outline-none transition-all placeholder:text-zinc-700" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Priority</label>
                    <select name="priority" defaultValue={editingTask?.priority || 'Standard'} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white focus:border-zinc-400 outline-none appearance-none">
                      <option className="bg-zinc-900" value="Standard">Standard</option>
                      <option className="bg-zinc-900 text-yellow-500" value="Urgent">Urgent</option>
                      <option className="bg-zinc-900 text-red-500" value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Department</label>
                    <select name="tag" defaultValue={editingTask?.tag || 'Strategy'} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white focus:border-zinc-400 outline-none appearance-none">
                      <option className="bg-zinc-900" value="Strategy">Strategy</option>
                      <option className="bg-zinc-900" value="Carrier RFP">Carrier RFP</option>
                      <option className="bg-zinc-900" value="RE Logistics">RE Logistics</option>
                      <option className="bg-zinc-900" value="TMS Dev">TMS Dev</option>
                      <option className="bg-zinc-900" value="FreightSnap">FreightSnap</option>
                      <option className="bg-zinc-900" value="Drayage">Drayage</option>
                      <option className="bg-zinc-900" value="Shipper Comms">Shipper Comms</option>
                      <option className="bg-zinc-900" value="External">External</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Calendar size={12} />
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    defaultValue={editingTask?.dueDate || ''}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white focus:border-zinc-400 outline-none transition-all [color-scheme:dark]"
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => { setShowModal(false); setEditingTask(null); setFormError(null); }} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Abort</button>
                  <button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/40 transition-all active:scale-95">{editingTask ? 'Update Task' : 'Execute Mission'}</button>
                </div>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* RFP MODAL */}
      <AnimatePresence>
        {showRfpModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-0 md:p-6">
            <motion.form
              onSubmit={addOrUpdateRfp}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a0c10] border-0 md:border border-white/10 p-6 md:p-10 rounded-none md:rounded-[2.5rem] w-full h-full md:h-auto max-w-full md:max-w-lg shadow-2xl relative overflow-auto md:overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent" />
              <h2 className="text-2xl font-black text-white italic uppercase mb-8 tracking-tighter">{editingRfp ? 'Edit RFP' : 'New RFP'}</h2>

              {formError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-bold">{formError}</div>}

              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">RFP Name</label>
                  <input name="name" defaultValue={editingRfp?.name || ''} maxLength={LIMITS.RFP_NAME} placeholder="e.g. Carrier Direct" required className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white focus:border-zinc-400 outline-none transition-all placeholder:text-zinc-700" />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Carrier Name</label>
                  <input name="carrier" defaultValue={editingRfp?.carrier || ''} maxLength={LIMITS.CARRIER_NAME} placeholder="e.g. Carrier Direct LLC" required className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white focus:border-zinc-400 outline-none transition-all placeholder:text-zinc-700" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Progress (%)</label>
                    <input name="progress" type="number" min="0" max="100" defaultValue={editingRfp?.progress || 0} required className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white focus:border-zinc-400 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Status</label>
                    <select name="status" defaultValue={editingRfp?.status || 'Request Sent'} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white focus:border-zinc-400 outline-none appearance-none">
                      <option className="bg-zinc-900" value="Request Sent">Request Sent</option>
                      <option className="bg-zinc-900" value="Rates Pending">Rates Pending</option>
                      <option className="bg-zinc-900" value="Under Review">Under Review</option>
                      <option className="bg-zinc-900" value="Finalizing">Finalizing</option>
                      <option className="bg-zinc-900" value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Calendar size={12} />
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    defaultValue={editingRfp?.dueDate || ''}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white focus:border-zinc-400 outline-none transition-all [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Notes (Optional)</label>
                  <textarea name="notes" defaultValue={editingRfp?.notes || ''} maxLength={LIMITS.RFP_NOTES} placeholder="Additional notes..." rows="3" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white focus:border-zinc-400 outline-none transition-all placeholder:text-zinc-700 resize-none"></textarea>
                </div>

                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => { setShowRfpModal(false); setEditingRfp(null); setFormError(null); }} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-900/40 transition-all active:scale-95">{editingRfp ? 'Update RFP' : 'Create RFP'}</button>
                </div>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* USER MANAGEMENT MODAL */}
      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-0 md:p-6">
            <motion.form
              onSubmit={addOrUpdateUser}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a0c10] border-0 md:border border-white/10 p-6 md:p-10 rounded-none md:rounded-[2.5rem] w-full h-full md:h-auto max-w-full md:max-w-lg shadow-2xl relative overflow-auto md:overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-transparent" />
              <h2 className="text-2xl font-black text-white italic uppercase mb-8 tracking-tighter">{editingUser ? 'Edit User' : 'New User'}</h2>

              {formError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-bold">{formError}</div>}

              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">User Name</label>
                  <input name="name" defaultValue={editingUser?.name || ''} maxLength={LIMITS.USER_NAME} placeholder="e.g. John Doe" required className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white focus:border-zinc-400 outline-none transition-all placeholder:text-zinc-700" />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Color Theme</label>
                  <select name="color" defaultValue={editingUser?.color || 'blue'} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white focus:border-zinc-400 outline-none appearance-none">
                    <option className="bg-zinc-900" value="blue">Blue</option>
                    <option className="bg-zinc-900" value="emerald">Emerald</option>
                    <option className="bg-zinc-900" value="purple">Purple</option>
                    <option className="bg-zinc-900" value="amber">Amber</option>
                    <option className="bg-zinc-900" value="cyan">Cyan</option>
                    <option className="bg-zinc-900" value="rose">Rose</option>
                    <option className="bg-zinc-900" value="indigo">Indigo</option>
                    <option className="bg-zinc-900" value="zinc">Zinc</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => { setShowUserModal(false); setEditingUser(null); setFormError(null); }} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-purple-900/40 transition-all active:scale-95">{editingUser ? 'Update User' : 'Add User'}</button>
                </div>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 flex justify-around items-center py-4 z-50">
        <button onClick={() => setView('board')} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${view === 'board' ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-500'}`}>
          <ClipboardList size={18} />
          <span className="text-[9px] font-bold uppercase">Board</span>
        </button>
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${view === 'dashboard' ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-500'}`}>
          <LayoutDashboard size={18} />
          <span className="text-[9px] font-bold uppercase">RFP</span>
        </button>
        <button onClick={() => setView('analytics')} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${view === 'analytics' ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-500'}`}>
          <BarChart3 size={18} />
          <span className="text-[9px] font-bold uppercase">Stats</span>
        </button>
        <button onClick={() => setShowModal(true)} className="flex flex-col items-center gap-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl text-white">
          <PlusCircle size={18} />
          <span className="text-[9px] font-bold uppercase">New</span>
        </button>
      </nav>
    </div>
  );
}

function Column({ column, onEditTask, onDeleteTask }) {
  const Icon = column.icon;
  const taskIds = column.tasks.map(task => task.id);
  const color = column.color || 'slate';

  const colorClasses = {
    slate: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    zinc: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
  };

  return (
    <div className="w-[85vw] md:w-80 flex-shrink-0 flex flex-col h-full max-h-[calc(100vh-220px)] md:max-h-[calc(100vh-220px)] snap-center">
      <div className="flex justify-between items-center mb-6 px-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${colorClasses[color]}`}>
            <Icon size={14} />
          </div>
          <h3 className="text-[11px] font-black text-white/60 uppercase tracking-[0.2em]">{column.title}</h3>
        </div>
        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-zinc-500 font-mono">{column.tasks.length}</span>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
          {column.tasks.map(task => (
            <TaskCard key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function TaskCard({ task, isDragging = false, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  // Calculate if task is overdue or approaching due date
  const getDueDateStatus = () => {
    if (!task.dueDate) return null;
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { status: 'overdue', color: 'text-red-500', IconComponent: AlertCircle };
    if (diffDays === 0) return { status: 'today', color: 'text-orange-500', IconComponent: Calendar };
    if (diffDays <= 3) return { status: 'soon', color: 'text-yellow-500', IconComponent: Calendar };
    return { status: 'scheduled', color: 'text-zinc-500', IconComponent: Calendar };
  };

  const dueDateStatus = getDueDateStatus();

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`bg-zinc-900/60 backdrop-blur-md border border-white/10 p-5 rounded-2xl hover:border-blue-500/40 transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden ${isDragging ? 'shadow-2xl shadow-blue-500/20' : ''}`}
    >
      <div className={`absolute top-0 left-0 h-full w-1 ${task.priority === 'Critical' ? 'bg-red-500' : task.priority === 'Urgent' ? 'bg-yellow-500' : 'bg-blue-500'}`} />

      {/* Action Buttons */}
      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 p-1.5 rounded-lg"
          title="Edit task"
        >
          <Edit2 size={12} className="text-blue-400" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 p-1.5 rounded-lg"
          title="Delete task"
        >
          <X size={12} className="text-red-400" />
        </button>
      </div>

      <div className="flex justify-between items-start mb-3" {...listeners}>
        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-tighter ${task.priority === 'Critical' ? 'bg-red-500/10 text-red-400' : task.priority === 'Urgent' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-blue-500/10 text-blue-400'}`}>{task.tag}</span>
        {task.priority !== 'Standard' && (
          <span className={`text-[8px] font-black uppercase ${task.priority === 'Critical' ? 'text-red-500' : 'text-yellow-500'}`}>{task.priority}</span>
        )}
      </div>

      <p className="text-[13px] text-white mb-4 leading-relaxed font-medium">{task.content}</p>

      {/* Date Display */}
      {task.dueDate && dueDateStatus && (
        <div className={`flex items-center gap-1.5 mb-3 ${dueDateStatus.color}`}>
          <dueDateStatus.IconComponent size={12} />
          <span className="text-[10px] font-bold uppercase tracking-wide">
            {dueDateStatus.status === 'overdue' && 'OVERDUE: '}
            {dueDateStatus.status === 'today' && 'DUE TODAY: '}
            {dueDateStatus.status === 'soon' && 'DUE SOON: '}
            {dueDateStatus.status === 'scheduled' && 'DUE: '}
            {formatDate(task.dueDate)}
          </span>
        </div>
      )}

      <div className="flex justify-between items-center pt-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-zinc-600 to-zinc-700 flex items-center justify-center text-[8px] font-bold text-white uppercase">{task.owner[0]}</div>
          <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{task.owner}</span>
        </div>
        {task.est && (
          <span className="text-[9px] text-zinc-500 font-mono">{task.est}</span>
        )}
      </div>
    </div>
  );
}

function NavIcon({ icon, active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`relative group p-3 rounded-xl transition-all duration-300 ${active ? 'bg-blue-600/20 text-blue-400 shadow-lg shadow-blue-900/20' : 'text-zinc-600 hover:text-white hover:bg-white/5'}`}
    >
      {icon}
      <span className="absolute left-full ml-4 px-2 py-1 bg-zinc-800 text-white text-[10px] font-bold uppercase rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
        {label}
      </span>
    </button>
  );
}

function RFPItem({ rfp, onEdit, onDelete }) {
  const getProgressColor = () => {
    if (rfp.progress >= 80) return 'from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
    if (rfp.progress >= 40) return 'from-amber-600 to-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]';
    return 'from-zinc-600 to-zinc-400 shadow-[0_0_15px_rgba(113,113,122,0.3)]';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl hover:bg-white/[0.04] transition-all group relative">
      {/* Action Buttons */}
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(rfp)}
          className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 p-2 rounded-lg transition-all"
          title="Edit RFP"
        >
          <Edit2 size={14} className="text-blue-400" />
        </button>
        <button
          onClick={() => onDelete(rfp.id)}
          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 p-2 rounded-lg transition-all"
          title="Delete RFP"
        >
          <X size={14} className="text-red-400" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
        <div className="flex-shrink-0">
          <h4 className="text-lg font-bold text-white mb-1 tracking-tight">{rfp.name}</h4>
          <p className="text-xs text-zinc-400 mb-1">{rfp.carrier}</p>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{rfp.status}</span>
            {rfp.dueDate && (
              <span className="text-[9px] text-zinc-600 flex items-center gap-1">
                <Calendar size={10} />
                Due {formatDate(rfp.dueDate)}
              </span>
            )}
          </div>
        </div>
        <div className="flex-1">
          <div className="h-2 bg-zinc-800/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${rfp.progress}%` }}
              className={`h-full bg-gradient-to-r ${getProgressColor()}`}
            />
          </div>
        </div>
        <div className="w-16 text-right flex-shrink-0">
          <span className="text-lg font-black text-white italic">{rfp.progress}%</span>
        </div>
      </div>
      {rfp.notes && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-xs text-zinc-500">{rfp.notes}</p>
        </div>
      )}
    </div>
  );
}

function AnalyticsView({ columns, rfps }) {
  const allTasks = columns.flatMap(col => col.tasks);
  const totalTasks = allTasks.length;

  // Priority breakdown
  const priorityStats = {
    Critical: allTasks.filter(t => t.priority === 'Critical').length,
    Urgent: allTasks.filter(t => t.priority === 'Urgent').length,
    Standard: allTasks.filter(t => t.priority === 'Standard').length,
  };

  // Owner breakdown
  const ownerStats = allTasks.reduce((acc, task) => {
    const owner = task.owner;
    acc[owner] = (acc[owner] || 0) + 1;
    return acc;
  }, {});

  // Department breakdown
  const deptStats = allTasks.reduce((acc, task) => {
    const dept = task.tag;
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  // Column breakdown
  const columnStats = columns.map(col => ({
    name: col.title,
    count: col.tasks.length,
    color: col.color
  }));

  // Upcoming deadlines (next 7 days)
  const today = new Date();
  const next7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingTasks = allTasks
    .filter(t => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) <= next7Days)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  // Overdue tasks
  const overdueTasks = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < today);

  // RFP stats
  const avgRfpProgress = rfps.length > 0 ? Math.round(rfps.reduce((sum, rfp) => sum + rfp.progress, 0) / rfps.length) : 0;

  const colorClasses = {
    slate: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    zinc: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
  };

  return (
    <div className="max-w-6xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <h2 className="text-2xl font-black text-white uppercase italic mb-6">Mission Analytics</h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={totalTasks} color="blue" />
        <StatCard label="Critical" value={priorityStats.Critical} color="red" />
        <StatCard label="Overdue" value={overdueTasks.length} color="orange" />
        <StatCard label="Avg RFP Progress" value={`${avgRfpProgress}%`} color="emerald" />
      </div>

      {/* Alerts */}
      {(overdueTasks.length > 0 || upcomingTasks.length > 0) && (
        <div className="space-y-3">
          {overdueTasks.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-red-400" />
                <span className="text-xs font-black text-red-400 uppercase tracking-widest">Overdue Tasks ({overdueTasks.length})</span>
              </div>
              <div className="space-y-1">
                {overdueTasks.slice(0, 3).map(task => (
                  <div key={task.id} className="text-xs text-red-300/80">{task.content} - {task.owner}</div>
                ))}
                {overdueTasks.length > 3 && <div className="text-xs text-red-400/60">+{overdueTasks.length - 3} more</div>}
              </div>
            </div>
          )}

          {upcomingTasks.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-yellow-400" />
                <span className="text-xs font-black text-yellow-400 uppercase tracking-widest">Due This Week ({upcomingTasks.length})</span>
              </div>
              <div className="space-y-1">
                {upcomingTasks.slice(0, 3).map(task => (
                  <div key={task.id} className="text-xs text-yellow-300/80">{task.content} - {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                ))}
                {upcomingTasks.length > 3 && <div className="text-xs text-yellow-400/60">+{upcomingTasks.length - 3} more</div>}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tasks by Column */}
        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Tasks by Status</h3>
          <div className="space-y-3">
            {columnStats.map(col => (
              <div key={col.name} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${colorClasses[col.color]?.split(' ')[0] || 'bg-zinc-500/20'}`} />
                <span className="text-xs text-zinc-400 flex-1">{col.name}</span>
                <span className="text-sm font-bold text-white">{col.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks by Priority */}
        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Priority Distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-zinc-400 flex-1">Critical</span>
              <span className="text-sm font-bold text-white">{priorityStats.Critical}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-xs text-zinc-400 flex-1">Urgent</span>
              <span className="text-sm font-bold text-white">{priorityStats.Urgent}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-zinc-400 flex-1">Standard</span>
              <span className="text-sm font-bold text-white">{priorityStats.Standard}</span>
            </div>
          </div>
        </div>

        {/* Tasks by Owner */}
        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Tasks by Owner</h3>
          <div className="space-y-3">
            {Object.entries(ownerStats)
              .sort(([, a], [, b]) => b - a)
              .map(([owner, count]) => (
                <div key={owner} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-zinc-600 to-zinc-700 flex items-center justify-center text-[9px] font-bold text-white uppercase">
                    {owner[0]}
                  </div>
                  <span className="text-xs text-zinc-400 flex-1">{owner}</span>
                  <span className="text-sm font-bold text-white">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Tasks by Department */}
        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Tasks by Department</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
            {Object.entries(deptStats)
              .sort(([, a], [, b]) => b - a)
              .map(([dept, count]) => (
                <div key={dept} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 flex-1">{dept}</span>
                  <span className="text-sm font-bold text-white">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-400',
    red: 'from-red-600 to-red-400',
    orange: 'from-orange-600 to-orange-400',
    emerald: 'from-emerald-600 to-emerald-400',
  };

  return (
    <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl">
      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">{label}</div>
      <div className={`text-3xl font-black bg-gradient-to-r ${colorClasses[color]} bg-clip-text text-transparent`}>
        {value}
      </div>
    </div>
  );
}

function SettingsView({ users, onEditUser, onDeleteUser, onAddUser }) {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-400',
    emerald: 'from-emerald-600 to-emerald-400',
    purple: 'from-purple-600 to-purple-400',
    amber: 'from-amber-600 to-amber-400',
    cyan: 'from-cyan-600 to-cyan-400',
    rose: 'from-rose-600 to-rose-400',
    indigo: 'from-indigo-600 to-indigo-400',
    zinc: 'from-zinc-600 to-zinc-400',
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <h2 className="text-2xl font-black text-white uppercase italic mb-6">Settings</h2>

      {/* User Management */}
      <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight">User Management</h3>
            <p className="text-xs text-zinc-500 mt-1">Manage team members and assignees</p>
          </div>
          <button
            onClick={onAddUser}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all hover:scale-105"
          >
            <PlusCircle size={14} />
            <span>ADD USER</span>
          </button>
        </div>

        <div className="space-y-3">
          {users.map(user => (
            <div key={user.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl hover:bg-white/[0.04] transition-all group relative">
              {/* Action Buttons */}
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEditUser(user)}
                  className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 p-1.5 rounded-lg transition-all"
                  title="Edit user"
                >
                  <Edit2 size={12} className="text-blue-400" />
                </button>
                <button
                  onClick={() => onDeleteUser(user.id)}
                  className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 p-1.5 rounded-lg transition-all"
                  title="Delete user"
                >
                  <X size={12} className="text-red-400" />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${colorClasses[user.color] || 'from-zinc-600 to-zinc-700'} flex items-center justify-center text-sm font-bold text-white uppercase shadow-lg`}>
                  {user.name[0]}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white">{user.name}</h4>
                  <p className="text-xs text-zinc-500 capitalize">{user.color} theme</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* App Info */}
      <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4">About</h3>
        <div className="space-y-2 text-xs text-zinc-500">
          <div className="flex justify-between">
            <span>App Version</span>
            <span className="text-white font-mono">2.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Project</span>
            <span className="text-white">Liberty Command - HIFA Launch</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarView({ columns }) {
  const allTasks = columns.flatMap(col => col.tasks).filter(task => task.dueDate);

  // Group tasks by date
  const tasksByDate = allTasks.reduce((acc, task) => {
    const date = new Date(task.dueDate).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(task);
    return acc;
  }, {});

  // Get upcoming tasks (next 30 days)
  const today = new Date();
  const next30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcomingTasks = allTasks
    .filter(task => {
      const taskDate = new Date(task.dueDate);
      return taskDate >= today && taskDate <= next30Days;
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  // Get overdue tasks
  const overdueTasks = allTasks
    .filter(task => new Date(task.dueDate) < today)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDayOfWeek = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getPriorityColor = (priority) => {
    if (priority === 'Critical') return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (priority === 'Urgent') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  };

  return (
    <div className="max-w-6xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <h2 className="text-2xl font-black text-white uppercase italic mb-6">Mission Calendar</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl">
          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Upcoming (30d)</div>
          <div className="text-3xl font-black bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            {upcomingTasks.length}
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl">
          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Overdue</div>
          <div className="text-3xl font-black bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent">
            {overdueTasks.length}
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl">
          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Total Scheduled</div>
          <div className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
            {allTasks.length}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={18} className="text-red-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Overdue Tasks</h3>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {overdueTasks.map(task => (
                <div key={task.id} className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm text-white font-medium flex-1">{task.content}</p>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(task.dueDate)}
                    </span>
                    <span>{task.owner}</span>
                    <span className="text-zinc-600">{task.tag}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Tasks Timeline */}
        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-blue-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Next 30 Days</h3>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {upcomingTasks.length > 0 ? upcomingTasks.map(task => (
              <div key={task.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl hover:bg-white/[0.04] transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm text-white font-medium flex-1">{task.content}</p>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={10} />
                    {formatDate(task.dueDate)} ({formatDayOfWeek(task.dueDate)})
                  </span>
                  <span>{task.owner}</span>
                  <span className="text-zinc-600">{task.tag}</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-zinc-600">
                <Clock size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No upcoming deadlines in the next 30 days</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* All Tasks by Date */}
      <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
        <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">All Scheduled Tasks</h3>
        <div className="space-y-4">
          {Object.entries(tasksByDate)
            .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
            .map(([date, tasks]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                    {formatDate(date)}
                  </div>
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-xs text-zinc-600">{tasks.length} task{tasks.length > 1 ? 's' : ''}</span>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {tasks.map(task => (
                    <div key={task.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-lg hover:bg-white/[0.04] transition-all">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-xs text-white font-medium flex-1">{task.content}</p>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                        <span>{task.owner}</span>
                        <span className="text-zinc-700">•</span>
                        <span>{task.tag}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          {Object.keys(tasksByDate).length === 0 && (
            <div className="text-center py-20 text-zinc-600">
              <Calendar size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No tasks with due dates yet</p>
              <p className="text-xs text-zinc-700 mt-1">Add due dates to tasks to see them here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
