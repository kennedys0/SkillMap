"use client";

import { useId, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { SkillMatch, SkillSummary } from "@/src/contracts/api";
import { filterSkills } from "../filter";
import { ClearIcon, SearchIcon } from "./Icons";
import { SkillCard } from "./SkillCard";

interface SkillInventoryProps {
  skills: SkillSummary[];
  isLoading: boolean;
  matches: SkillMatch[];
  scannerReady: boolean;
}

export function SkillInventory({
  skills,
  isLoading,
  matches,
  scannerReady,
}: SkillInventoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputId = useId();

  // Create match lookup by skillId
  const matchMap = useMemo(() => {
    const map = new Map<string, SkillMatch>();
    for (const match of matches) {
      map.set(match.skillId, match);
    }
    return map;
  }, [matches]);

  const filteredSkills = useMemo(() => {
    return filterSkills(skills, searchQuery);
  }, [skills, searchQuery]);

  return (
    <Box component="section" aria-labelledby="inventory-heading">
      <Stack spacing={2.5}>
        {/* Section Header */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
          }}
        >
          <Box>
            <Typography
              component="h2"
              id="inventory-heading"
              variant="h6"
              sx={{ fontWeight: 700, color: "text.primary" }}
            >
              Skills Inventory
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Discovered from your local <code>SKILLS_ROOT</code> directory.
            </Typography>
          </Box>

          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: "text.secondary",
              backgroundColor: "rgba(0,0,0,0.04)",
              px: 1.5,
              py: 0.5,
              borderRadius: 1.5,
            }}
            aria-live="polite"
          >
            {isLoading
              ? "Scanning..."
              : skills.length === 0
              ? "0 skills"
              : searchQuery.trim()
              ? `Showing ${filteredSkills.length} of ${skills.length} skills`
              : `${skills.length} ${skills.length === 1 ? "skill" : "skills"}`}
          </Typography>
        </Stack>

        {/* Search Input */}
        <TextField
          id={searchInputId}
          fullWidth
          size="small"
          placeholder="Filter skills by name, description, path, or tag…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            htmlInput: {
              "aria-label": "Search skills by name, description, path, or tag",
            },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    aria-label="Clear search filter"
                    onClick={() => setSearchQuery("")}
                    edge="end"
                  >
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "background.paper",
              borderRadius: 2,
            },
          }}
        />

        {/* Loading Skeletons */}
        {isLoading && (
          <Stack spacing={2} aria-busy="true">
            {[1, 2, 3].map((n) => (
              <Paper
                key={n}
                variant="outlined"
                sx={{ p: 2.5, borderRadius: 2, backgroundColor: "background.paper" }}
              >
                <Skeleton variant="text" width="40%" height={28} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="60%" height={18} sx={{ mb: 1.5 }} />
                <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
              </Paper>
            ))}
          </Stack>
        )}

        {/* Empty State: Ready scanner, but zero skills found */}
        {!isLoading && scannerReady && skills.length === 0 && (
          <Paper
            variant="outlined"
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: 2,
              backgroundColor: "background.paper",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              No skills found in directory
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 460, mx: "auto" }}
            >
              The directory exists and was scanned, but contains no valid{" "}
              <code>SKILL.md</code> files. Add your skill markdown files with YAML
              frontmatter to see them listed here.
            </Typography>
          </Paper>
        )}

        {/* Empty State: Search filter has no match */}
        {!isLoading && skills.length > 0 && filteredSkills.length === 0 && (
          <Paper
            variant="outlined"
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: 2,
              backgroundColor: "background.paper",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              No matching skills
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No skills match &ldquo;{searchQuery.trim()}&rdquo;.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSearchQuery("")}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Clear search filter
            </Button>
          </Paper>
        )}

        {/* Skills List */}
        {!isLoading && filteredSkills.length > 0 && (
          <Stack spacing={2}>
            {filteredSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                match={matchMap.get(skill.id)}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
