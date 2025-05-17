import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { EditorFormProps } from "@/lib/types";
import { summarySchema, SummaryValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import GenerateSummaryButton from "./GenerateSummaryButton";
import useDebounce from "@/hooks/useDebounce";

export default function SummaryForm({
  resumeData,
  setResumeData,
}: EditorFormProps) {
  const initRef = useRef<SummaryValues>({ summary: resumeData.summary ?? "" });

  /* 2 ▸ useForm único */
  const form = useForm<SummaryValues>({
    resolver: zodResolver(summarySchema),
    defaultValues: initRef.current,
    mode: "onBlur",
  });

  /* 3 ▸ watch + debounce */
  const watchedSummary = useWatch({ control: form.control, name: "summary" });
  const debounced = useDebounce(watchedSummary, 400);

  useEffect(() => {
    (async () => {
      const ok = await form.trigger("summary");
      if (ok) setResumeData((prev) => ({ ...prev, summary: debounced ?? "" }));
    })();
  }, [debounced, form, setResumeData]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1.5 text-center">
        <h2 className="text-2xl font-semibold">Professional summary</h2>
        <p className="text-sm text-muted-foreground">
          Write a short introduction for your resume or let the AI generate one
          from your entered data.
        </p>
      </div>
      <Form {...form}>
        <form className="space-y-3">
          <FormField
            control={form.control}
            name="summary"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Professional summary</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="A brief, engaging text about yourself"
                  />
                </FormControl>
                <FormMessage />
                <GenerateSummaryButton
                  resumeData={resumeData}
                  onSummaryGenerated={(summary) =>
                    form.setValue("summary", summary)
                  }
                />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}
