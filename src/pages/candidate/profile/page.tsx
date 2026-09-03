import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { PlusIcon, TrashIcon, BriefcaseIcon, GraduationCapIcon, UserIcon, XIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";

const profileSchema = z.object({
  headline: z.string().min(1, "Required").max(120),
  bio: z.string().max(500).optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
});

const experienceSchema = z.object({
  company: z.string().min(1, "Required"),
  title: z.string().min(1, "Required"),
  startDate: z.string().min(1, "Required"),
  endDate: z.string().optional(),
  current: z.boolean(),
  description: z.string().optional(),
});

const educationSchema = z.object({
  institution: z.string().min(1, "Required"),
  degree: z.string().min(1, "Required"),
  field: z.string().min(1, "Required"),
  startYear: z.string().min(1, "Required"),
  endYear: z.string().optional(),
  current: z.boolean(),
});

function SkillsInput({ skills, onChange }: { skills: string[]; onChange: (s: string[]) => void }) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !skills.includes(trimmed)) {
      onChange([...skills, trimmed]);
      setInput("");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); }}}
          placeholder="Type a skill and press Enter"
        />
        <Button type="button" size="sm" onClick={add}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.map((s) => (
          <Badge key={s} variant="secondary" className="gap-1">
            {s}
            <button type="button" onClick={() => onChange(skills.filter((x) => x !== s))}>
              <XIcon className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

type ProfileType = {
  headline?: string;
  bio?: string;
  location?: string;
  phone?: string;
  skills?: string[];
} | null;

type UserType = {
  _id: string;
  name?: string;
  email?: string;
};

function BasicInfoForm({ user, profile }: { user: UserType; profile: ProfileType }) {
  const upsert = useMutation(api.candidates.upsertProfile);
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      headline: profile?.headline ?? "",
      bio: profile?.bio ?? "",
      location: profile?.location ?? "",
      phone: profile?.phone ?? "",
    },
  });

  const onSubmit = async (data: z.infer<typeof profileSchema>) => {
    try {
      await upsert({ ...data, skills });
      toast.success("Profile saved!");
    } catch {
      toast.error("Failed to save profile.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserIcon className="w-4 h-4" /> Basic Info
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input value={user.name ?? ""} disabled className="bg-muted" />
                </FormControl>
              </FormItem>
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input value={user.email ?? ""} disabled className="bg-muted" />
                </FormControl>
              </FormItem>
            </div>
            <FormField control={form.control} name="headline" render={({ field }) => (
              <FormItem>
                <FormLabel>Professional Headline</FormLabel>
                <FormControl><Input placeholder="e.g. Senior Frontend Engineer" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl><Input placeholder="Lagos, Nigeria" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input placeholder="+234 800 000 0000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="bio" render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl><Textarea rows={3} placeholder="Brief professional summary..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div>
              <FormLabel className="block mb-2">Skills</FormLabel>
              <SkillsInput skills={skills} onChange={setSkills} />
            </div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function WorkExperienceSection({ userId }: { userId: string }) {
  const data = useQuery(api.candidates.getMyProfile);
  const addExp = useMutation(api.candidates.addWorkExperience);
  const delExp = useMutation(api.candidates.deleteWorkExperience);
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof experienceSchema>>({
    resolver: zodResolver(experienceSchema),
    defaultValues: { company: "", title: "", startDate: "", endDate: "", current: false, description: "" },
  });

  const onSubmit = async (data: z.infer<typeof experienceSchema>) => {
    try {
      await addExp(data);
      toast.success("Experience added!");
      setOpen(false);
      form.reset();
    } catch {
      toast.error("Failed to add experience.");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <BriefcaseIcon className="w-4 h-4" /> Work Experience
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="secondary"><PlusIcon className="w-4 h-4 mr-1" /> Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Work Experience</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="company" render={({ field }) => (
                  <FormItem><FormLabel>Company</FormLabel><FormControl><Input placeholder="Acme Corp" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input placeholder="Software Engineer" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="month" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem><FormLabel>End Date</FormLabel><FormControl><Input type="month" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>Add Experience</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {data === undefined ? (
          <Skeleton className="h-16 w-full" />
        ) : (data?.experiences ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No work experience added yet.</p>
        ) : (
          (data?.experiences ?? []).map((exp) => (
            <div key={exp._id} className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0">
              <div>
                <p className="font-semibold text-sm">{exp.title}</p>
                <p className="text-sm text-muted-foreground">{exp.company}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {exp.startDate} — {exp.current ? "Present" : (exp.endDate ?? "")}
                </p>
                {exp.description && <p className="text-xs mt-1 text-foreground/70">{exp.description}</p>}
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => delExp({ id: exp._id })}>
                <TrashIcon className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function EducationSection({ userId }: { userId: string }) {
  const data = useQuery(api.candidates.getMyProfile);
  const addEdu = useMutation(api.candidates.addEducation);
  const delEdu = useMutation(api.candidates.deleteEducation);
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof educationSchema>>({
    resolver: zodResolver(educationSchema),
    defaultValues: { institution: "", degree: "", field: "", startYear: "", endYear: "", current: false },
  });

  const onSubmit = async (data: z.infer<typeof educationSchema>) => {
    try {
      await addEdu(data);
      toast.success("Education added!");
      setOpen(false);
      form.reset();
    } catch {
      toast.error("Failed to add education.");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCapIcon className="w-4 h-4" /> Education
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="secondary"><PlusIcon className="w-4 h-4 mr-1" /> Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Education</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="institution" render={({ field }) => (
                  <FormItem><FormLabel>Institution</FormLabel><FormControl><Input placeholder="University of Lagos" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="degree" render={({ field }) => (
                    <FormItem><FormLabel>Degree</FormLabel><FormControl><Input placeholder="B.Sc" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="field" render={({ field }) => (
                    <FormItem><FormLabel>Field of Study</FormLabel><FormControl><Input placeholder="Computer Science" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="startYear" render={({ field }) => (
                    <FormItem><FormLabel>Start Year</FormLabel><FormControl><Input placeholder="2018" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="endYear" render={({ field }) => (
                    <FormItem><FormLabel>End Year</FormLabel><FormControl><Input placeholder="2022" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>Add Education</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {data === undefined ? (
          <Skeleton className="h-16 w-full" />
        ) : (data?.educations ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No education added yet.</p>
        ) : (
          (data?.educations ?? []).map((edu) => (
            <div key={edu._id} className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0">
              <div>
                <p className="font-semibold text-sm">{edu.degree} in {edu.field}</p>
                <p className="text-sm text-muted-foreground">{edu.institution}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {edu.startYear} — {edu.current ? "Present" : (edu.endYear ?? "")}
                </p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => delEdu({ id: edu._id })}>
                <TrashIcon className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function CandidateProfile() {
  const data = useQuery(api.candidates.getMyProfile);

  if (data === undefined) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold">My Profile</h2>
        <p className="text-muted-foreground mt-1">Keep your profile up to date to get discovered by employers.</p>
      </div>

      <BasicInfoForm user={data?.user ?? { _id: "", name: "", email: "" }} profile={data?.profile ?? null} />
      <WorkExperienceSection userId={data?.user._id ?? ""} />
      <EducationSection userId={data?.user._id ?? ""} />
    </div>
  );
}
