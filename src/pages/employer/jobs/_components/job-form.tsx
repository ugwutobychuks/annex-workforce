import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { XIcon } from "lucide-react";

const schema = z.object({
  title: z.string().min(1, "Required"),
  company: z.string().min(1, "Required"),
  location: z.string().min(1, "Required"),
  type: z.enum(["full-time", "part-time", "contract", "internship"]),
  description: z.string().min(10, "Please provide a detailed description"),
  requirements: z.string().min(10, "Please list the requirements"),
  salary: z.string().optional(),
  status: z.enum(["draft", "published"]),
});

export type JobFormValues = z.infer<typeof schema> & { skills: string[] };

type Props = {
  onSubmit: (data: JobFormValues) => Promise<void>;
  submitting: boolean;
  defaultValues?: Partial<JobFormValues>;
};

export function JobForm({ onSubmit, submitting, defaultValues }: Props) {
  const [skills, setSkills] = useState<string[]>(defaultValues?.skills ?? []);
  const [skillInput, setSkillInput] = useState("");

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      company: defaultValues?.company ?? "",
      location: defaultValues?.location ?? "",
      type: defaultValues?.type ?? "full-time",
      description: defaultValues?.description ?? "",
      requirements: defaultValues?.requirements ?? "",
      salary: defaultValues?.salary ?? "",
      status: defaultValues?.status ?? "draft",
    },
  });

  const addSkill = () => {
    const t = skillInput.trim();
    if (t && !skills.includes(t)) {
      setSkills([...skills, t]);
      setSkillInput("");
    }
  };

  const handleSubmit = async (data: z.infer<typeof schema>) => {
    await onSubmit({ ...data, skills, salary: data.salary || undefined });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem>
              <FormLabel>Job Title *</FormLabel>
              <FormControl><Input placeholder="Senior Engineer" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="company" render={({ field }) => (
            <FormItem>
              <FormLabel>Company *</FormLabel>
              <FormControl><Input placeholder="Acme Corp" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem>
              <FormLabel>Location *</FormLabel>
              <FormControl><Input placeholder="Lagos, Nigeria" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem>
              <FormLabel>Job Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="salary" render={({ field }) => (
            <FormItem>
              <FormLabel>Salary Range</FormLabel>
              <FormControl><Input placeholder="\u20a6300,000 \u2013 \u20a6500,000/mo" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="draft">Save as Draft</SelectItem>
                  <SelectItem value="published">Publish Now</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Job Description *</FormLabel>
            <FormControl><Textarea rows={4} placeholder="Describe the role, responsibilities, and team..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="requirements" render={({ field }) => (
          <FormItem>
            <FormLabel>Requirements *</FormLabel>
            <FormControl><Textarea rows={4} placeholder="List required skills, experience, and qualifications..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="space-y-2">
          <FormLabel>Skills</FormLabel>
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
              placeholder="e.g. React, Python..."
            />
            <Button type="button" size="sm" onClick={addSkill}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <Badge key={s} variant="secondary" className="gap-1">
                {s}
                <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))}>
                  <XIcon className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Saving..." : (defaultValues ? "Update Job" : "Create Job")}
        </Button>
      </form>
    </Form>
  );
}
