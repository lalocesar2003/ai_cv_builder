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
import { cn } from "@/lib/utils";
import { educationSchema, EducationValues } from "@/lib/validation";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import { GripHorizontal } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  useFieldArray,
  useForm,
  UseFormReturn,
  useWatch,
} from "react-hook-form";

export default function EducationForm({
  resumeData,
  setResumeData,
}: EditorFormProps) {
  const initRef = useRef<EducationValues>({
    educations: resumeData.educations ?? [],
  });
  const form = useForm<EducationValues>({
    resolver: zodResolver(educationSchema),
    defaultValues: initRef.current,
    mode: "onBlur",
  });

  const watched = useWatch({ control: form.control });
  const debouncedVal = useDebounce(watched, 400);

  useEffect(() => {
    (async () => {
      const ok = await form.trigger();
      if (!ok) return;
      setResumeData((prev) => ({
        ...prev,
        educations: debouncedVal.educations?.filter(Boolean) ?? [],
      }));
    })();
  }, [debouncedVal, form, setResumeData]);
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "educations",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const oldIdx = fields.findIndex((f) => f.id === active.id);
      const newIdx = fields.findIndex((f) => f.id === over.id);
      move(oldIdx, newIdx);
      arrayMove(fields, oldIdx, newIdx); // solo animación
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1.5 text-center">
        <h2 className="text-2xl font-semibold">Education</h2>
        <p className="text-sm text-muted-foreground">
          Add as many educations as you like.
        </p>
      </div>
      <Form {...form}>
        <form className="space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext
              items={fields}
              strategy={verticalListSortingStrategy}
            >
              {fields.map((field, index) => (
                <EducationItem
                  id={field.id}
                  key={field.id}
                  index={index}
                  form={form}
                  remove={remove}
                />
              ))}
            </SortableContext>
          </DndContext>
          <div className="flex justify-center">
            <Button
              type="button"
              onClick={() =>
                append({ degree: "", school: "", startDate: "", endDate: "" })
              }
            >
              Add education
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

interface EducationItemProps {
  id: string;
  form: UseFormReturn<EducationValues>;
  index: number;
  remove: (index: number) => void;
}

function EducationItem({ id, form, index, remove }: EducationItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      className={cn(
        "space-y-3 rounded-md border bg-background p-3",
        isDragging && "relative z-50 cursor-grab shadow-xl",
      )}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="flex justify-between gap-2">
        <span className="font-semibold">Education {index + 1}</span>
        <GripHorizontal
          className="size-5 cursor-grab text-muted-foreground focus:outline-none"
          {...attributes}
          {...listeners}
        />
      </div>
      <FormField
        control={form.control}
        name={`educations.${index}.degree`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Degree</FormLabel>
            <FormControl>
              <Input {...field} autoFocus />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`educations.${index}.school`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>School</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name={`educations.${index}.startDate`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start date</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="date"
                  value={field.value?.slice(0, 10)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`educations.${index}.endDate`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>End date</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="date"
                  value={field.value?.slice(0, 10)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <Button variant="destructive" type="button" onClick={() => remove(index)}>
        Remove
      </Button>
    </div>
  );
}
