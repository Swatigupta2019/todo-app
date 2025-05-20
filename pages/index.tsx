import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function isBrowser() {
  return typeof window !== "undefined";
}

function getFromLocalStorage(key: string, fallback: any) {
  if (!isBrowser()) return fallback;
  const stored = localStorage.getItem(key);
  return stored !== null ? JSON.parse(stored) : fallback;
}

function setToLocalStorage(key: string, value: any) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function SortableItem({ todo, onEdit, onDelete, onToggle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col gap-1 justify-between p-4 rounded-2xl shadow-xl bg-gradient-to-r from-white to-blue-50 hover:scale-[1.01] transition-transform`}
    >
      <div className="flex justify-between items-start">
        <div {...listeners} className="cursor-grab pr-2 select-none flex items-center" title="Drag to reorder">
          <span className="text-gray-400">☰</span>
        </div>
        <div className="flex items-start gap-2 w-full">
          <input
            type="checkbox"
            checked={todo.is_complete}
            onChange={() => onToggle(todo.id, todo.is_complete)}
            className="mt-1 accent-indigo-600"
          />
          <input
            type="text"
            value={todo.task}
            onChange={(e) => onEdit(todo.id, e.target.value)}
            className={`border-none outline-none flex-grow bg-transparent text-lg font-semibold ${
              todo.is_complete ? "line-through text-gray-400" : "text-gray-900"
            }`}
          />
        </div>
        <button
          type="button"
          className="rounded-full h-6 w-6 text-xs px-0 py-0 bg-red-500 text-white hover:bg-red-600"
          onClick={() => onDelete(todo.id)}
        >
          ✕
        </button>
      </div>
      <div className="text-xs text-gray-500 flex justify-between mt-1 px-1 italic">
        <span>{todo.category || "🗂️ Uncategorized"}</span>
        <span>{todo.due_date ? format(new Date(todo.due_date), "MMM do, yyyy") : "📅 No Due Date"}</span>
      </div>
    </motion.div>
  );
}

export default function TodoApp() {
  const [todos, setTodos] = useState<any[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [xp, setXp] = useState<number | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [lastCompleteDate, setLastCompleteDate] = useState<string | null>(null);

  useEffect(() => {
    fetchTodos();
    if (isBrowser()) {
      setXp(getFromLocalStorage("xp", 0));
      setStreak(getFromLocalStorage("streak", 0));
      setLastCompleteDate(getFromLocalStorage("lastCompleteDate", null));
    }
  }, []);

  async function fetchTodos() {
    const { data } = await supabase.from("todos").select("*").order("order", { ascending: true });
    if (data) setTodos(data);
  }

  async function addTodo() {
    if (!newTask.trim()) return;
    await supabase.from("todos").insert([
      {
        task: newTask,
        due_date: newDueDate || null,
        category: newCategory,
        order: todos.length,
        is_complete: false,
      },
    ]);
    setNewTask("");
    setNewDueDate("");
    setNewCategory("");
    fetchTodos();
  }

  async function updateTask(id: number, newText: string) {
    await supabase.from("todos").update({ task: newText }).eq("id", id);
  }

  async function toggleComplete(id: number, currentStatus: boolean) {
    const newStatus = !currentStatus;
    await supabase.from("todos").update({ is_complete: newStatus }).eq("id", id);

    if (newStatus && isBrowser()) {
      const today = new Date().toDateString();
      if (lastCompleteDate !== today) {
        const newXp = (xp || 0) + 10;
        const newStreak = (streak || 0) + 1;
        setXp(newXp);
        setStreak(newStreak);
        setLastCompleteDate(today);
        setToLocalStorage("xp", newXp);
        setToLocalStorage("streak", newStreak);
      }
    }

    fetchTodos();
  }

  async function deleteTodo(id: number) {
    await supabase.from("todos").delete().eq("id", id);
    fetchTodos();
  }

  async function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = todos.findIndex((t) => t.id === active.id);
    const newIndex = todos.findIndex((t) => t.id === over.id);
    const newOrder = arrayMove(todos, oldIndex, newIndex);
    setTodos(newOrder);

    for (let i = 0; i < newOrder.length; i++) {
      await supabase.from("todos").update({ order: i }).eq("id", newOrder[i].id);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-200 via-pink-100 to-blue-100 p-6 flex flex-col items-center font-sans">
      <h1 className="text-4xl font-extrabold mb-4 text-center text-indigo-700">✨ My Magical To-Do List ✨</h1>

      {xp !== null && streak !== null && (
        <div className="mb-4 text-sm text-center">
          <p className="font-semibold text-indigo-900">
            🏅 XP: {xp} | 🔥 Streak: {streak} day{streak !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      <Card className="w-full max-w-xl shadow-2xl rounded-3xl p-6 bg-white/70 backdrop-blur">
        <CardContent>
          <div className="flex flex-col md:flex-row gap-2 items-center mb-4">
            <Input
              placeholder="Add a new task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="flex-grow"
            />
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full md:w-auto p-2 rounded-md border border-gray-300"
            />
            <Input
              placeholder="Category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full md:w-auto"
            />
            <Button onClick={addTodo}>Add</Button>
          </div>

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {todos.map((todo) => (
                  <SortableItem
                    key={todo.id}
                    todo={todo}
                    onEdit={updateTask}
                    onDelete={deleteTodo}
                    onToggle={toggleComplete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>
    </main>
  );
}
