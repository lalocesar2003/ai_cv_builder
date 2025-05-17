import { Prisma } from "@prisma/client";
import { ResumeValues } from "./validation";
import { Dispatch, SetStateAction } from "react";

export interface EditorFormProps {
  resumeData: ResumeValues;
  setResumeData: Dispatch<SetStateAction<ResumeValues>>;
  //          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //   acepta objeto o función
}
export const resumeDataInclude = {
  workExperiences: true,
  educations: true,
} satisfies Prisma.ResumeInclude;

export type ResumeServerData = Prisma.ResumeGetPayload<{
  include: typeof resumeDataInclude;
}>;
