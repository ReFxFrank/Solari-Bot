import { z } from 'zod';

/**
 * A single Discord modal can hold at most 5 text inputs, so a form is capped at
 * 5 questions. The dashboard enforces this too.
 */
export const APPLICATION_MAX_QUESTIONS = 5;

export const APPLICATION_QUESTION_STYLES = ['short', 'paragraph'] as const;
export type ApplicationQuestionStyle = (typeof APPLICATION_QUESTION_STYLES)[number];

/**
 * One form question. Limits mirror Discord's TextInput constraints (label ≤ 45,
 * placeholder ≤ 100, value ≤ 4000) so a stored question always renders into a
 * valid modal component.
 */
export const applicationQuestionSchema = z
  .object({
    /** Stable id; used as the modal input's customId and to key the answer. */
    id: z.string().min(1).max(64),
    label: z.string().min(1).max(45),
    style: z.enum(APPLICATION_QUESTION_STYLES).default('paragraph'),
    required: z.boolean().default(true),
    placeholder: z.string().max(100).optional(),
    minLength: z.number().int().min(0).max(4000).optional(),
    maxLength: z.number().int().min(1).max(4000).optional(),
  })
  .superRefine((q, ctx) => {
    if (q.minLength != null && q.maxLength != null && q.minLength > q.maxLength) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'minLength cannot exceed maxLength',
        path: ['minLength'],
      });
    }
  });
export type ApplicationQuestion = z.infer<typeof applicationQuestionSchema>;

export const applicationQuestionsSchema = z
  .array(applicationQuestionSchema)
  .max(APPLICATION_MAX_QUESTIONS);

/** A snapshot of one answer, stored on the submission so it survives form edits. */
export const applicationAnswerSchema = z.object({
  questionId: z.string(),
  label: z.string(),
  value: z.string(),
});
export type ApplicationAnswer = z.infer<typeof applicationAnswerSchema>;
export const applicationAnswersSchema = z.array(applicationAnswerSchema);

/** Module-level settings (per-form review channel/role live on the form rows). */
export const applicationsConfigSchema = z.object({
  /** Roles allowed to approve/deny submissions, in addition to Manage Server. */
  staffRoleIds: z.array(z.string()).default([]),
});
export type ApplicationsConfig = z.infer<typeof applicationsConfigSchema>;

/** Parse a form's stored questions JSON, returning [] on anything malformed. */
export function parseApplicationQuestions(raw: unknown): ApplicationQuestion[] {
  const result = applicationQuestionsSchema.safeParse(raw ?? []);
  return result.success ? result.data : [];
}

/** Parse a submission's stored answers JSON, returning [] on anything malformed. */
export function parseApplicationAnswers(raw: unknown): ApplicationAnswer[] {
  const result = applicationAnswersSchema.safeParse(raw ?? []);
  return result.success ? result.data : [];
}
