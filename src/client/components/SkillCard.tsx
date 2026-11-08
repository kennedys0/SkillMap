"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SkillMatch, SkillSummary } from "@/src/contracts/api";
import { FileIcon, TagIcon, TargetIcon } from "./Icons";

interface SkillCardProps {
  skill: SkillSummary;
  match?: SkillMatch;
}

export function SkillCard({ skill, match }: SkillCardProps) {
  const isMatched = Boolean(match);

  return (
    <Paper
      component="article"
      variant="outlined"
      sx={{
        p: { xs: 2.25, sm: 2.75 },
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
        {/* Title and Origin / Match Status */}
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
            <Typography
              component="h3"
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                fontSize: "1.05rem",
                letterSpacing: "-0.01em",
              }}
            >
              {skill.name}
            </Typography>

            {isMatched && match && (
              <Chip
                size="small"
                icon={<TargetIcon sx={{ fontSize: 15 }} />}
                label={`Match: ${match.score} pts`}
                sx={{
                  backgroundColor: "#e8f0eb",
                  color: "#1c4a38",
                  fontWeight: 700,
                  fontSize: "0.775rem",
                  borderRadius: 1.5,
                  height: 24,
                }}
              />
            )}
          </Stack>

          {/* Safe relative origin path */}
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ alignItems: "center" }}
          >
            <FileIcon sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography
              variant="caption"
              sx={{
                fontFamily: "monospace",
                color: "text.secondary",
                fontSize: "0.775rem",
                wordBreak: "break-all",
              }}
            >
              {skill.relativePath}
            </Typography>
          </Stack>
        </Box>

        {/* Skill description */}
        <Typography
          variant="body2"
          sx={{
            color: "text.primary",
            lineHeight: 1.6,
            wordBreak: "break-word",
          }}
        >
          {skill.description}
        </Typography>

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
              sx={{ display: "block", color: "#1c4a38", fontWeight: 600, mb: 0.5 }}
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
                      fontSize: "0.725rem",
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
              pt: 0.5,
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
