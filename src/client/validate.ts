export const MAX_PROJECT_DESCRIPTION_LENGTH = 2_000;

export interface ValidationResult {
  valid: boolean;
  trimmedText: string;
  characterCount: number;
  error?: string;
}

/**
 * Validates the project description brief for the match API.
 * The input must be 1 to 2,000 characters after trimming.
 */
export function validateProjectDescription(input: string): ValidationResult {
  const trimmedText = input.trim();
  // Count Unicode code points properly
  const characterCount = [...trimmedText].length;

  if (characterCount === 0) {
    return {
      valid: false,
      trimmedText: "",
      characterCount: 0,
      error: "Project description is required.",
    };
  }

  if (characterCount > MAX_PROJECT_DESCRIPTION_LENGTH) {
    return {
      valid: false,
      trimmedText,
      characterCount,
      error: `Project description cannot exceed ${MAX_PROJECT_DESCRIPTION_LENGTH} characters (currently ${characterCount}).`,
    };
  }

  return {
    valid: true,
    trimmedText,
    characterCount,
  };
}
