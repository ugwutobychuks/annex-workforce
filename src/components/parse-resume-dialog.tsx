import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SparklesIcon } from "lucide-react";

/**
 * Paste-resume-text → parsed headline/bio/skills, then save into the
 * candidate's profile. Merges with any skills already there (dedup, no
 * loss). Uses the same LLM adapter as the JD writer — falls back to a
 * heuristic parser when ANTHROPIC_API_KEY isn't configured.
 */
export function ParseResumeDialog({
  open,
  onClose,
  currentSkills,
}: {
  open: boolean;
  onClose: () => void;
  currentSkills: string[];
}) {
  const parse = useAction(api.ai.parseResumeText);
  const upsert = useMutation(api.candidates.upsertProfile);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<{ headline: string; bio: string; skills: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const runParse = async () => {
    setBusy(true);
    try {
      const res = await parse({ text });
      setPreview(res);
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Parse failed.");
    } finally { setBusy(false); }
  };

  const applyToProfile = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const merged = Array.from(new Set([...(currentSkills ?? []), ...preview.skills]));
      await upsert({
        headline: preview.headline || undefined,
        bio: preview.bio || undefined,
        skills: merged,
      });
      toast.success("Profile updated.");
      onClose(); setText(""); setPreview(null);
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } }).data?.message ?? "Save failed.");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setPreview(null); setText(""); } }}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Parse resume text</DialogTitle></DialogHeader>
        {!preview ? (
          <>
            <p className="text-sm text-muted-foreground">
              Paste your resume as plain text below. We'll extract a headline,
              a short bio, and skills you can review before saving.
            </p>
            <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your resume here…" />
            <DialogFooter>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button disabled={busy || text.trim().length < 40} onClick={runParse}>
                <SparklesIcon className="w-4 h-4 mr-2" /> {busy ? "Parsing…" : "Parse"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Headline</p>
                <p className="font-medium">{preview.headline || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Bio</p>
                <p className="text-sm">{preview.bio || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Skills</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {preview.skills.length === 0
                    ? <span className="text-sm text-muted-foreground">None detected</span>
                    : preview.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Saving replaces headline + bio, and merges skills with what you already have.
              </p>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => { setPreview(null); }}>Re-edit text</Button>
              <Button disabled={busy} onClick={applyToProfile}>{busy ? "Saving…" : "Save to profile"}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
