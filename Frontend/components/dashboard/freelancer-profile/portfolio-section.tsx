"use client";

import { EmptyHint, Panel } from "@/components/dashboard/freelancer-profile/controls";
import {
  ProjectEditor,
  newEditableProject,
} from "@/components/dashboard/project-editor";
import { P } from "@/lib/design-tokens";
import { Plus } from "lucide-react";
import { useState } from "react";
import type {
  EditableProfile,
  EditableProject,
} from "~/components/dashboard/profile-editor-types";

export function PortfolioSection({
  profile,
  patch,
}: {
  profile: EditableProfile;
  patch: (p: Partial<EditableProfile>) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const projects = profile.projects ?? [];

  function addProject() {
    const proj = newEditableProject(profile.category, projects.length);
    patch({ projects: [proj, ...projects] });
    setEditingId(proj.id);
  }

  function updateProject(id: string, next: EditableProject) {
    patch({
      projects: projects.map((p: EditableProject) => (p.id === id ? next : p)),
    });
  }

  function removeProject(id: string) {
    patch({ projects: projects.filter((p: EditableProject) => p.id !== id) });
    if (editingId === id) setEditingId(null);
  }

  return (
    <Panel
      id="portfolio"
      title="الشو-ريل والأعمال"
      desc="كل مقطع تضيفه يصبح دراسة حالة كاملة بصفحة خاصة يستعرضها العملاء."
      action={
        <button
          type="button"
          onClick={addProject}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: P.primary }}
        >
          <Plus className="size-4" />
          فيديو جديد
        </button>
      }
    >
      {projects.length === 0 ? (
        <EmptyHint text="لم تُضف أي مقطع بعد. ابدأ بإضافة أول فيديو من شو-ريلك." />
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((proj: EditableProject) => (
            <ProjectEditor
              key={proj.id}
              project={proj}
              open={editingId === proj.id}
              onToggle={() =>
                setEditingId((cur) => (cur === proj.id ? null : proj.id))
              }
              onChange={(next) => updateProject(proj.id, next)}
              onRemove={() => removeProject(proj.id)}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}
