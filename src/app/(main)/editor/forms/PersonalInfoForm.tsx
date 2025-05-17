import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import useDebounce from "@/hooks/useDebounce";
import { EditorFormProps } from "@/lib/types";
import { personalInfoSchema, PersonalInfoValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";

export default function PersonalInfoForm({
  resumeData,
  setResumeData,
}: EditorFormProps) {
  const initialValuesRef = useRef<PersonalInfoValues>({
    firstName: resumeData.firstName ?? "",
    lastName: resumeData.lastName ?? "",
    jobTitle: resumeData.jobTitle ?? "",
    city: resumeData.city ?? "",
    country: resumeData.country ?? "",
    phone: resumeData.phone ?? "",
    email: resumeData.email ?? "",
    photo: resumeData.photo instanceof File ? resumeData.photo : undefined,
  });

  /* 2 ▸ instancia única del formulario */
  const form = useForm<PersonalInfoValues>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: initialValuesRef.current,
    mode: "onBlur",
  });

  /* 3 ▸ escucha cambios UNA sola vez y aplícales debounce */
  const values = useWatch({ control: form.control });
  const debouncedVals = useDebounce(values, 400);

  useEffect(() => {
    (async () => {
      const ok = await form.trigger();
      if (!ok) return;
      setResumeData((prev) => ({ ...prev, ...debouncedVals }));
    })();
  }, [debouncedVals, form, setResumeData]);

  /* 4 ▸ input file necesita una ref para “reset” */
  const photoInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1.5 text-center">
        <h2 className="text-2xl font-semibold">Personal info</h2>
        <p className="text-sm text-muted-foreground">Tell us about yourself.</p>
      </div>

      <Form {...form}>
        <form className="space-y-3">
          {/* PHOTO */}
          <FormField
            control={form.control}
            name="photo"
            render={({ field }) => {
              /* value (y ref) no sirven con <input type="file">,
       así que los sacamos y nos quedamos solo con lo necesario */
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { value, ref, ...fieldWithoutValue } = field;

              return (
                <FormItem>
                  <FormLabel>Your photo</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        {...fieldWithoutValue}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          fieldWithoutValue.onChange(file);
                        }}
                        ref={photoInputRef}
                      />
                    </FormControl>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => {
                        fieldWithoutValue.onChange(null);
                        if (photoInputRef.current?.value) {
                          photoInputRef.current.value = "";
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {/* FIRST & LAST NAME */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* JOB TITLE */}
          <FormField
            control={form.control}
            name="jobTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* CITY & COUNTRY */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* PHONE */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} type="tel" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* EMAIL */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}
