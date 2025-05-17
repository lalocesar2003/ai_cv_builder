import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import useDebounce from "@/hooks/useDebounce";
import { EditorFormProps } from "@/lib/types";
import { skillsSchema, SkillsValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";

export default function SkillsForm({
  resumeData,
  setResumeData,
}: EditorFormProps) {
  const initRef = useRef<SkillsValues>({
    skills: resumeData.skills ?? [],
  });

  /* 2 ▸ useForm único */
  const form = useForm<SkillsValues>({
    resolver: zodResolver(skillsSchema),
    defaultValues: initRef.current,
    mode: "onChange", // valida mientras se escribe (ligero)
  });

  /* 3 ▸ watch + debounce */
  const watchedSkills = useWatch({ control: form.control, name: "skills" });
  const debouncedSkills = useDebounce(watchedSkills, 400);

  useEffect(() => {
    (async () => {
      const ok = await form.trigger("skills");
      if (!ok) return;

      const cleanSkills = (debouncedSkills ?? [])
        .filter(Boolean)
        .map((s) => s.trim())
        .filter(Boolean);

      setResumeData((prev) => ({ ...prev, skills: cleanSkills }));
    })();
  }, [debouncedSkills, form, setResumeData]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1.5 text-center">
        <h2 className="text-2xl font-semibold">Skills</h2>
        <p className="text-sm text-muted-foreground">What are you good at?</p>
      </div>
      <Form {...form}>
        <form className="space-y-3">
          <FormField
            control={form.control}
            name="skills"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Skills</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="e.g. React.js, Node.js, graphic design, ..."
                    onChange={(e) => {
                      const skills = e.target.value.split(",");
                      field.onChange(skills);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Separate each skill with a comma.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}
