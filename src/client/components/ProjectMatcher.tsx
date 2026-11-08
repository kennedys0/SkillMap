"use client";

import { useId, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type {
  SkillMatch,
  SkillSourceScanInfo,
  SkillSummary,
} from "@/src/contracts/api";
import {
  MAX_PROJECT_DESCRIPTION_LENGTH,
  validateProjectDescription,
} from "../validate";
import { CheckIcon, FileIcon, PlusIcon, TargetIcon } from "./Icons";

interface ProjectMatcherProps {
  skills: SkillSummary[];
  sources?: SkillSourceScanInfo[];
  matches: SkillMatch[];
  isMatching: boolean;
  matchError: string | null;
  hasRunMatch: boolean;
  onMatch: (projectDescription: string) => void;
  onClear: () => void;
  isSkillInPack?: (skill: SkillSummary) => boolean;
  onToggleSkillInPack?: (skill: SkillSummary) => void;
}

export function ProjectMatcher({
  skills,
  sources = [],
  matches,
  isMatching,
  matchError,
  hasRunMatch,
  onMatch,
  onClear,
  isSkillInPack,
  onToggleSkillInPack,
}: ProjectMatcherProps) {
  const [description, setDescription] = useState("");
  const inputId = useId();

  const skillLookup = useMemo(() => {
    const map = new Map<string, SkillSummary>();
    for (const s of skills) {
      map.set(s.id, s);
    }
    return map;
  }, [skills]);

  const sourceLookup = useMemo(() => {
    const map = new Map<string, SkillSourceScanInfo>();
    for (const src of sources) {
      map.set(src.id, src);
    }
    return map;
  }, [sources]);

  const validation = validateProjectDescription(description);
  const characterCount = [...description.trim()].length;
  const isOverLimit = characterCount > MAX_PROJECT_DESCRIPTION_LENGTH;
  const canSubmit = validation.valid && !isMatching;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.valid || isMatching) {
      return;
    }
    onMatch(validation.trimmedText);
  };

  const handleClear = () => {
    setDescription("");
    onClear();
  };

  return (
    <Box component="section" aria-labelledby="matcher-heading">
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.25, md: 3 },
          borderRadius: 2,
          backgroundColor: "background.paper",
        }}
      >
        <Stack spacing={2.5}>
          {/* Header */}
          <Box>
            <Typography
              component="h2"
              id="matcher-heading"
              variant="h6"
              sx={{ fontWeight: 700, color: "text.primary" }}
            >
              Project Matcher
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Describe your project brief to find relevant skills using exact keyword
              weights (name: 3, tag: 2, description: 1).
            </Typography>
          </Box>

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              <TextField
                id={inputId}
                label="Project description"
                placeholder="e.g. Building an accessible React web app with Next.js, MUI components, and Playwright end-to-end tests..."
                multiline
                minRows={4}
                maxRows={10}
                fullWidth
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                error={isOverLimit}
                helperText={
                  isOverLimit
                    ? `Description cannot exceed ${MAX_PROJECT_DESCRIPTION_LENGTH} characters.`
                    : `${characterCount} / ${MAX_PROJECT_DESCRIPTION_LENGTH} characters`
                }
                slotProps={{
                  htmlInput: {
                    "aria-label": "Project description for skill matching",
                  },
                  formHelperText: {
                    sx: {
                      textAlign: "right",
                      color: isOverLimit ? "error.main" : "text.secondary",
                    },
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />

              {/* Action Buttons */}
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!canSubmit}
                  startIcon={
                    isMatching ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <TargetIcon sx={{ fontSize: 18 }} />
                    )
                  }
                  sx={{
                    minHeight: 40,
                    textTransform: "none",
                    fontWeight: 600,
                    px: 2.5,
                  }}
                >
                  {isMatching ? "Matching..." : "Match skills"}
                </Button>

                {(description || hasRunMatch) && (
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={handleClear}
                    disabled={isMatching}
                    sx={{
                      minHeight: 40,
                      textTransform: "none",
                      fontWeight: 600,
                      borderColor: "divider",
                      color: "text.primary",
                    }}
                  >
                    Clear
                  </Button>
                )}
              </Stack>
            </Stack>
          </Box>

          {/* Match Error Banner */}
          {matchError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {matchError}
            </Alert>
          )}

          {/* Match Results */}
          {hasRunMatch && !isMatching && (
            <Box sx={{ mt: 1 }} aria-live="polite">
              {matches.length === 0 ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    textAlign: "center",
                    backgroundColor: "#faf9f6",
                    borderColor: "divider",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    No matching skills found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your brief shared zero meaningful metadata terms with discovered
                    skills. Try using specific technology names, languages, or
                    workflow terms.
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    sx={{
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, color: "text.primary" }}
                    >
                      Recommendations ({matches.length})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Ordered by score descending
                    </Typography>
                  </Stack>

                  <Stack spacing={1.5}>
                    {matches.map((match, index) => {
                      const skill = skillLookup.get(match.skillId);
                      const displayName = skill ? skill.name : match.skillId;
                      const relativePath = skill?.relativePath;
                      const source = skill?.sourceId
                        ? sourceLookup.get(skill.sourceId)
                        : undefined;

                      return (
                        <Paper
                          key={match.skillId}
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: 1.5,
                            backgroundColor: "#fcfbfa",
                            borderColor: index === 0 ? "primary.main" : "divider",
                            borderWidth: index === 0 ? 2 : 1,
                          }}
                        >
                          <Stack spacing={1}>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                              }}
                            >
                              <Box>
                                <Typography
                                  component="h4"
                                  variant="subtitle2"
                                  sx={{ fontWeight: 700, color: "text.primary" }}
                                >
                                  {displayName}
                                </Typography>

                                {relativePath && (
                                  <Stack
                                    direction="row"
                                    spacing={0.5}
                                    sx={{ alignItems: "center", mt: 0.25 }}
                                  >
                                    <FileIcon
                                      sx={{ fontSize: 13, color: "text.secondary" }}
                                    />
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontFamily: "monospace",
                                        color: "text.secondary",
                                        fontSize: "0.725rem",
                                      }}
                                    >
                                      {relativePath}
                                    </Typography>
                                  </Stack>
                                )}
                              </Box>

                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{ alignItems: "center" }}
                              >
                                <Chip
                                  size="small"
                                  label={`${match.score} pts`}
                                  sx={{
                                    backgroundColor: "#e8f0eb",
                                    color: "#1c4a38",
                                    fontWeight: 700,
                                    fontSize: "0.775rem",
                                    height: 24,
                                  }}
                                />

                                {skill && onToggleSkillInPack && (
                                  <Button
                                    size="small"
                                    variant={
                                      isSkillInPack?.(skill)
                                        ? "contained"
                                        : "outlined"
                                    }
                                    color="primary"
                                    onClick={() => onToggleSkillInPack(skill)}
                                    startIcon={
                                      isSkillInPack?.(skill) ? (
                                        <CheckIcon sx={{ fontSize: 14 }} />
                                      ) : (
                                        <PlusIcon sx={{ fontSize: 14 }} />
                                      )
                                    }
                                    aria-label={
                                      isSkillInPack?.(skill)
                                        ? `Remove ${displayName} from pack`
                                        : `Add ${displayName} to pack`
                                    }
                                    aria-pressed={Boolean(isSkillInPack?.(skill))}
                                    sx={{
                                      height: 24,
                                      fontSize: "0.725rem",
                                      fontWeight: 600,
                                      borderRadius: 1.5,
                                      textTransform: "none",
                                      px: 1.25,
                                      backgroundColor: isSkillInPack?.(skill)
                                        ? "primary.main"
                                        : "transparent",
                                      color: isSkillInPack?.(skill)
                                        ? "primary.contrastText"
                                        : "primary.main",
                                      borderColor: "primary.main",
                                      "&:hover": {
                                        backgroundColor: isSkillInPack?.(skill)
                                          ? "primary.dark"
                                          : "rgba(49, 92, 76, 0.08)",
                                        borderColor: "primary.dark",
                                      },
                                    }}
                                  >
                                    {isSkillInPack?.(skill)
                                      ? "In Pack"
                                      : "Add to Pack"}
                                  </Button>
                                )}
                              </Stack>
                            </Stack>

                            {/* Provenance Indicator and Clear Disclaimer */}
                            {source && (
                              <Box
                                sx={{
                                  p: 1,
                                  borderRadius: 1,
                                  backgroundColor: "rgba(0,0,0,0.02)",
                                  border: "1px solid #e7e5dc",
                                }}
                              >
                                <Stack
                                  direction="row"
                                  spacing={0.75}
                                  sx={{ alignItems: "center", mb: 0.25 }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{ fontWeight: 700, color: "text.primary" }}
                                  >
                                    Source: {source.label}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={source.agent}
                                    sx={{
                                      height: 18,
                                      fontSize: "0.675rem",
                                      borderRadius: 1,
                                      backgroundColor: "#f0ece3",
                                    }}
                                  />
                                </Stack>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: "block",
                                    color: "text.secondary",
                                    fontSize: "0.7rem",
                                    lineHeight: 1.3,
                                  }}
                                >
                                  Discovered in configured source directory. Agent
                                  labels denote provenance only, not execution
                                  compatibility.
                                </Typography>
                              </Box>
                            )}

                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary", display: "block" }}
                            >
                              {match.reason}
                            </Typography>

                            {match.matchedTerms.length > 0 && (
                              <Stack
                                direction="row"
                                spacing={0.5}
                                useFlexGap
                                sx={{ flexWrap: "wrap", alignItems: "center" }}
                              >
                                {match.matchedTerms.map((term) => (
                                  <Chip
                                    key={term}
                                    label={term}
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: "0.7rem",
                                      backgroundColor: "#ffffff",
                                      border: "1px solid #d4d0c5",
                                    }}
                                  />
                                ))}
                              </Stack>
                            )}
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                </Stack>
              )}
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
