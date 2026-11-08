"use client";

import { useId, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type {
  SkillMatch,
  SkillSourceScanInfo,
  SkillSummary,
} from "@/src/contracts/api";
import { CheckIcon, FileIcon, PlusIcon, TagIcon, TargetIcon } from "./Icons";

interface SkillCardProps {
  skill: SkillSummary;
  source?: SkillSourceScanInfo;
  match?: SkillMatch;
  inPack?: boolean;
  onTogglePack?: () => void;
}

const CLAMP_CHARACTER_THRESHOLD = 140;

export function SkillCard({
  skill,
  source,
  match,
  inPack = false,
  onTogglePack,
}: SkillCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const descriptionId = useId();
  const isMatched = Boolean(match);

  const isLongDescription =
    skill.description.length > CLAMP_CHARACTER_THRESHOLD ||
    skill.description.includes("\n");

  const sourceLabel = source?.label || source?.agent || skill.sourceId;

  return (
    <Paper
      component="article"
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        backgroundColor: isMatched ? "#fbfdfc" : "background.paper",
        borderColor: isMatched ? "primary.main" : "divider",
        borderWidth: isMatched ? 2 : 1,
        transition: "box-shadow 0.15s ease, border-color 0.15s ease",
        "&:hover": {
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          borderColor: isMatched ? "primary.dark" : "#c5c0b4",
        },
      }}
    >
      <Stack spacing={1.5}>
        {/* Title, Source Badge, and Match Badge */}
        <Box>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              mb: 0.75,
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}
            >
              <Typography
                component="h3"
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  color: "text.primary",
                  fontSize: "1rem",
                  letterSpacing: "-0.01em",
                }}
              >
                {skill.name}
              </Typography>

              {sourceLabel && (
                <Chip
                  size="small"
                  label={sourceLabel}
                  variant="outlined"
                  sx={{
                    fontSize: "0.725rem",
                    fontWeight: 600,
                    borderRadius: 1.5,
                    height: 22,
                    borderColor: "divider",
                    backgroundColor: "rgba(0,0,0,0.03)",
                    color: "text.secondary",
                  }}
                />
              )}
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}
            >
              {isMatched && match && (
                <Chip
                  size="small"
                  icon={<TargetIcon sx={{ fontSize: 14 }} />}
                  label={`Match: ${match.score} pts`}
                  sx={{
                    backgroundColor: "#e8f0eb",
                    color: "#1c4a38",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    borderRadius: 1.5,
                    height: 24,
                  }}
                />
              )}

              {onTogglePack && (
                <Button
                  size="small"
                  variant={inPack ? "contained" : "outlined"}
                  color="primary"
                  onClick={onTogglePack}
                  startIcon={
                    inPack ? (
                      <CheckIcon sx={{ fontSize: 14 }} />
                    ) : (
                      <PlusIcon sx={{ fontSize: 14 }} />
                    )
                  }
                  aria-label={
                    inPack
                      ? `Remove ${skill.name} from pack`
                      : `Add ${skill.name} to pack`
                  }
                  aria-pressed={inPack}
                  sx={{
                    height: 24,
                    fontSize: "0.725rem",
                    fontWeight: 600,
                    borderRadius: 1.5,
                    textTransform: "none",
                    px: 1.25,
                    backgroundColor: inPack ? "primary.main" : "transparent",
                    color: inPack ? "primary.contrastText" : "primary.main",
                    borderColor: "primary.main",
                    "&:hover": {
                      backgroundColor: inPack
                        ? "primary.dark"
                        : "rgba(49, 92, 76, 0.08)",
                      borderColor: "primary.dark",
                    },
                  }}
                >
                  {inPack ? "In Pack" : "Add to Pack"}
                </Button>
              )}
            </Stack>
          </Stack>

          {/* Safe relative origin path */}
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <FileIcon sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography
              variant="caption"
              sx={{
                fontFamily: "monospace",
                color: "text.secondary",
                fontSize: "0.75rem",
                wordBreak: "break-all",
              }}
            >
              {skill.relativePath}
            </Typography>
          </Stack>
        </Box>

        {/* Skill description with accessible clamping and expand toggle */}
        <Box>
          <Typography
            id={descriptionId}
            variant="body2"
            sx={{
              color: "text.primary",
              lineHeight: 1.55,
              wordBreak: "break-word",
              ...(!isExpanded &&
                isLongDescription && {
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }),
            }}
          >
            {skill.description}
          </Typography>

          {isLongDescription && (
            <Button
              size="small"
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-expanded={isExpanded}
              aria-controls={descriptionId}
              sx={{
                p: 0,
                mt: 0.5,
                minWidth: 0,
                textTransform: "none",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "primary.main",
                display: "inline-block",
                "&:hover": {
                  textDecoration: "underline",
                  backgroundColor: "transparent",
                },
              }}
            >
              {isExpanded ? "Show less" : "Show more"}
            </Button>
          )}
        </Box>

        {/* Matched explanation if matched */}
        {isMatched && match && (
          <Box
            sx={{
              p: 1.25,
              borderRadius: 1.5,
              backgroundColor: "#f2f7f4",
              border: "1px solid #d4e4db",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: "#1c4a38",
                fontWeight: 600,
                mb: 0.5,
              }}
            >
              Why this matches: {match.reason}
            </Typography>
            {match.matchedTerms.length > 0 && (
              <Stack
                direction="row"
                spacing={0.5}
                useFlexGap
                sx={{ flexWrap: "wrap", alignItems: "center" }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", mr: 0.5 }}
                >
                  Matched terms:
                </Typography>
                {match.matchedTerms.map((term) => (
                  <Chip
                    key={term}
                    label={term}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.7rem",
                      backgroundColor: "#ffffff",
                      borderColor: "#c1dacb",
                      border: "1px solid",
                      color: "#1c4a38",
                      fontWeight: 600,
                    }}
                  />
                ))}
              </Stack>
            )}
          </Box>
        )}

        {/* Tags */}
        {skill.tags.length > 0 && (
          <Stack
            direction="row"
            spacing={0.75}
            useFlexGap
            sx={{
              pt: 0.25,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <TagIcon sx={{ fontSize: 13, color: "text.secondary" }} />
            {skill.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                sx={{
                  height: 22,
                  fontSize: "0.725rem",
                  borderRadius: 1,
                  borderColor: "divider",
                  color: "text.secondary",
                  backgroundColor: "rgba(0,0,0,0.02)",
                }}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
