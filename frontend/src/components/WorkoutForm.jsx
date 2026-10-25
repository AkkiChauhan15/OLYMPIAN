import { useState } from "react";
import { Plus, Trash2, Check, LoaderCircle, Dumbbell } from "lucide-react";
import { api } from "../services/api";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { Modal } from "./ui";

const newSet = () => ({ id: crypto.randomUUID(), reps: "", weightKg: "0" });
const newExercise = () => ({
  id: crypto.randomUUID(),
  name: "",
  sets: [newSet()],
});
export default function WorkoutForm({ onClose }) {
  const { user, refresh } = useApp();
  const notify = useToast();
  const [type, setType] = useState("Strength");
  const [duration, setDuration] = useState("");
  const [exercises, setExercises] = useState([newExercise()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const updateExercise = (id, update) =>
    setExercises((current) =>
      current.map((e) => (e.id === id ? { ...e, ...update } : e)),
    );
  const updateSet = (exerciseId, setId, key, value) =>
    setExercises((current) =>
      current.map((e) =>
        e.id === exerciseId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId ? { ...s, [key]: value } : s,
              ),
            }
          : e,
      ),
    );
  const removeSet = (exerciseId, setId) =>
    setExercises((current) =>
      current.map((e) =>
        e.id === exerciseId
          ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
          : e,
      ),
    );
  async function submit(event) {
    event.preventDefault();
    if (busy || !user) return;
    const invalid =
      !type.trim() ||
      !Number.isFinite(Number(duration)) ||
      Number(duration) < 1 ||
      !exercises.length ||
      exercises.some(
        (e) =>
          !e.name.trim() ||
          !e.sets.length ||
          e.sets.some(
            (s) =>
              s.reps === "" ||
              !Number.isInteger(Number(s.reps)) ||
              Number(s.reps) < 0 ||
              s.weightKg === "" ||
              !Number.isFinite(Number(s.weightKg)) ||
              Number(s.weightKg) < 0,
          ),
      );
    if (invalid) {
      setError(
        "Add a workout type, a duration of at least 1 minute, and at least one named exercise with valid sets.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.logWorkout({
        workoutType: type.trim(),
        durationMinutes: Number(duration),
        exercises: exercises.map((e) => ({
          name: e.name.trim(),
          sets: e.sets.map((s) => ({
            reps: Number(s.reps),
            weightKg: Number(s.weightKg),
          })),
        })),
      });
      refresh();
      notify("Workout saved. Another step stronger.");
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Log your workout"
      description={`Record the work you put in${user ? `, ${user.name.trim().split(/\s+/)[0]}` : ""}.`}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit} className="workout-form">
        <fieldset disabled={busy}>
          <div className="form-grid">
            <label>
              Workout type
              <select value={type} onChange={(e) => setType(e.target.value)}>
                {[
                  "Strength",
                  "Push Day",
                  "Pull Day",
                  "Leg Day",
                  "Full Body",
                  "Cardio",
                  "HIIT",
                  "Mobility",
                  "Other",
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Duration <span className="label-hint">minutes</span>
              <input
                type="number"
                min="1"
                step="1"
                required
                placeholder="e.g. 45"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </label>
          </div>
          <div className="form-section-heading">
            <h3>
              <Dumbbell size={17} />
              Your exercises
            </h3>
            <span>
              {exercises.length} exercise{exercises.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="exercise-edit-list">
            {exercises.map((exercise, i) => (
              <section className="exercise-editor" key={exercise.id}>
                <div className="exercise-editor-heading">
                  <span className="exercise-index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <label className="sr-only" htmlFor={`name-${exercise.id}`}>
                    Exercise {i + 1} name
                  </label>
                  <input
                    id={`name-${exercise.id}`}
                    required
                    placeholder="Exercise name, e.g. Bench Press"
                    value={exercise.name}
                    maxLength={120}
                    onChange={(e) =>
                      updateExercise(exercise.id, { name: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="icon-button danger"
                    disabled={exercises.length === 1}
                    aria-label={`Remove exercise ${i + 1}`}
                    onClick={() =>
                      setExercises((current) =>
                        current.filter((e) => e.id !== exercise.id),
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="set-labels">
                  <span>SET</span>
                  <span>REPETITIONS</span>
                  <span>WEIGHT (KG)</span>
                  <span />
                </div>
                {exercise.sets.map((set, j) => (
                  <div className="set-editor" key={set.id}>
                    <span>{String(j + 1).padStart(2, "0")}</span>
                    <input
                      aria-label={`Exercise ${i + 1} set ${j + 1} repetitions`}
                      type="number"
                      min="0"
                      step="1"
                      required
                      placeholder="12"
                      value={set.reps}
                      onChange={(e) =>
                        updateSet(exercise.id, set.id, "reps", e.target.value)
                      }
                    />
                    <input
                      aria-label={`Exercise ${i + 1} set ${j + 1} weight in kilograms`}
                      type="number"
                      min="0"
                      step="0.1"
                      required
                      value={set.weightKg}
                      onChange={(e) =>
                        updateSet(
                          exercise.id,
                          set.id,
                          "weightKg",
                          e.target.value,
                        )
                      }
                    />
                    <button
                      className="icon-button danger"
                      type="button"
                      disabled={exercise.sets.length === 1}
                      aria-label={`Remove exercise ${i + 1} set ${j + 1}`}
                      onClick={() => removeSet(exercise.id, set.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="inline-button add-set"
                  onClick={() =>
                    updateExercise(exercise.id, {
                      sets: [...exercise.sets, newSet()],
                    })
                  }
                >
                  <Plus size={14} />
                  Add set
                </button>
              </section>
            ))}
          </div>
          <button
            type="button"
            className="button dashed full-width"
            onClick={() =>
              setExercises((current) => [...current, newExercise()])
            }
          >
            <Plus size={17} />
            Add exercise
          </button>
          <p className="form-note">
            Bodyweight exercise? Leave the weight at 0 kg. Workouts are recorded
            for today.
          </p>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="modal-footer">
            <button
              className="button secondary"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="button primary" type="submit" disabled={!user}>
              {busy ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <Check size={17} />
              )}
              {busy ? "Saving workout…" : "Save workout"}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
