import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import useDebounce from "@/hooks/useDebounce";
import { EditorFormProps } from "@/lib/types";
import { generalInfoSchema, GeneralInfoValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
export default function GeneralInfoForm({
  resumeData,
  setResumeData,
}: EditorFormProps) {
  const initialValuesRef = useRef<GeneralInfoValues>({
    title: resumeData.title ?? "",
    description: resumeData.description ?? "",
  });

  const form = useForm<GeneralInfoValues>({
    resolver: zodResolver(generalInfoSchema),
    defaultValues: initialValuesRef.current,
    mode: "onBlur", // validación ligera
  });

  const values = useWatch({ control: form.control });
  const debouncedVals = useDebounce(values, 400);

  useEffect(() => {
    (async () => {
      const valid = await form.trigger(); // valida una vez
      if (!valid) return;
      setResumeData((prev) => ({ ...prev, ...debouncedVals }));
    })();
  }, [debouncedVals, form, setResumeData]);
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1.5 text-center">
        <h2 className="text-2xl font-semibold">General info</h2>
        <p className="text-sm text-muted-foreground">
          This will not appear on your resume.
        </p>
      </div>
      <Form {...form}>
        <form className="space-y-3">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="My cool resume" autoFocus />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="A resume for my next job" />
                </FormControl>
                <FormDescription>
                  Describe what this resume is for.
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
