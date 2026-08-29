import { toast } from "sonner";

/** Reminds users that studio canvases are read-only — edit happens in Editor after Save. */
export function notifySaveToEditInEditor(title = "Draft ready") {
  toast.success(title, {
    description: "Save this draft, then open it in Editor to make changes.",
    duration: 5000,
  });
}
