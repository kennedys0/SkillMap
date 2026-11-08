"use client";

import { useId, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type {
  SkillMatch,
  SkillSourceScanInfo,
  SkillSummary,
} from "@/src/contracts/api";
import { deriveCategories, filterSkills } from "../filter";
import { ClearIcon, SearchIcon, WarningIcon } from "./Icons";
import { SkillCard } from "./SkillCard";

interface SkillInventoryProps {
  skills: SkillSummary[];
  sources?: SkillSourceScanInfo[];
  isLoading: boolean;
  matches: SkillMatch[];
  scannerReady: boolean;
  isSkillInPack?: (skill: SkillSummary) => boolean;
  onToggleSkillInPack?: (skill: SkillSummary) => void;
}

export function SkillInventory({
  skills,
  sources = [],
  isLoading,
  matches,
  scannerReady,
  isSkillInPack,
  onToggleSkillInPack,
}: SkillInventoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const searchInputId = useId();

  // Create lookup maps for fast access
  const sourcesMap = useMemo(() => {
    const map = new Map<string, SkillSourceScanInfo>();
    for (const source of sources) {
      map.set(source.id, source);
    }
    return map;
  }, [sources]);

  const matchMap = useMemo(() => {
    const map = new Map<string, SkillMatch>();
    for (const match of matches) {
      map.set(match.skillId, match);
    }
    return map;
  }, [matches]);

  // Derive categories with honest counts and statuses
  const categories = useMemo(() => {
    return deriveCategories(skills, sources);
  }, [skills, sources]);

  const activeCategory = useMemo(() => {
    return (
      categories.find((c) => c.id === selectedCategory) ??
      categories.find((c) => c.id === "all") ??
      categories[0]
    );
  }, [categories, selectedCategory]);

  // Filter skills by selected category and search query
  const filteredSkills = useMemo(() => {
    return filterSkills(skills, searchQuery, {
      category: selectedCategory,
      sources,
    });
  }, [skills, searchQuery, selectedCategory, sources]);

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
              Discovered from configured local skill directories.
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
              : searchQuery.trim() || selectedCategory !== "all"
              ? `Showing ${filteredSkills.length} of ${skills.length} skills`
              : `${skills.length} ${skills.length === 1 ? "skill" : "skills"}`}
          </Typography>
        </Stack>

        {/* Category Filter Pills */}
        <Box
          component="nav"
          aria-label="Filter skills by agent category"
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const hasError = cat.hasError;
            const isNotConfigured = !cat.configured && cat.id !== "all";

            return (
              <Chip
                key={cat.id}
                label={
                  <Box
                    component="span"
                    sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}
                  >
                    <span>{cat.label}</span>
                    <Box
                      component="span"
                      sx={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        px: 0.6,
                        py: 0.1,
                        borderRadius: 1,
                        backgroundColor: isSelected
                          ? "rgba(255,255,255,0.25)"
                          : "rgba(0,0,0,0.06)",
                        color: isSelected ? "inherit" : "text.secondary",
                      }}
                    >
                      {isNotConfigured ? "—" : cat.skillCount}
                    </Box>
                  </Box>
                }
                onClick={() => setSelectedCategory(cat.id)}
                color={isSelected ? "primary" : "default"}
                variant={isSelected ? "filled" : "outlined"}
                clickable
                icon={
                  hasError ? (
                    <WarningIcon sx={{ fontSize: 14 }} />
                  ) : undefined
                }
                sx={{
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: "0.8rem",
                  height: 30,
                  borderRadius: 1.5,
                  borderColor: isSelected
                    ? "primary.main"
                    : hasError
                    ? "#e0b080"
                    : "divider",
                  "&:hover": {
                    backgroundColor: isSelected
                      ? "primary.dark"
                      : "rgba(0,0,0,0.04)",
                  },
                }}
              />
            );
          })}
        </Box>

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
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  backgroundColor: "background.paper",
                }}
              >
                <Skeleton variant="text" width="40%" height={28} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="60%" height={18} sx={{ mb: 1.5 }} />
                <Skeleton
                  variant="rectangular"
                  height={40}
                  sx={{ borderRadius: 1 }}
                />
              </Paper>
            ))}
          </Stack>
        )}

        {/* Honest Category State: Selected category is not configured in SKILL_SOURCES_JSON */}
        {!isLoading &&
          activeCategory &&
          !activeCategory.configured &&
          activeCategory.id !== "all" && (
            <Paper
              variant="outlined"
              sx={{
                p: 3.5,
                textAlign: "center",
                borderRadius: 2,
                backgroundColor: "#fffdf9",
                borderColor: "#ecdcc7",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, mb: 1, color: "#6a3b00" }}
              >
                No source configured for {activeCategory.label}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "#543714", maxWidth: 480, mx: "auto", mb: 2 }}
              >
                No skill sources with agent category{" "}
                <code>&quot;{activeCategory.id}&quot;</code> are declared in{" "}
                <code>SKILL_SOURCES_JSON</code>. To discover skills for this
                agent, add a source entry with <code>agent: &quot;{activeCategory.id}&quot;</code> in your <code>.env.local</code>.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSelectedCategory("all")}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Show all configured skills
              </Button>
            </Paper>
          )}

        {/* Honest Category State: Configured sources for this category failed or have errors */}
        {!isLoading &&
          activeCategory &&
          activeCategory.configured &&
          !activeCategory.hasReadySource &&
          activeCategory.hasError && (
            <Paper
              variant="outlined"
              sx={{
                p: 3.5,
                textAlign: "center",
                borderRadius: 2,
                backgroundColor: "#fffafa",
                borderColor: "#f0c8c8",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, mb: 1, color: "error.main" }}
              >
                Source unavailable for {activeCategory.label}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ maxWidth: 480, mx: "auto", mb: 2 }}
              >
                The directory configured for {activeCategory.label} encountered an
                error (status: <code>{activeCategory.statusSummary}</code>). Please
                verify that the folder path exists and is readable.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSelectedCategory("all")}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                View other categories
              </Button>
            </Paper>
          )}

        {/* Empty State: Ready scanner, but zero skills found in this category */}
        {!isLoading &&
          scannerReady &&
          activeCategory &&
          (activeCategory.id === "all" || activeCategory.hasReadySource) &&
          activeCategory.skillCount === 0 && (
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
                {activeCategory.id === "all"
                  ? "No skills found in configured directories"
                  : `No skills found in ${activeCategory.label} source`}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ maxWidth: 460, mx: "auto" }}
              >
                The directory exists and was scanned successfully, but contains no
                valid <code>SKILL.md</code> files. Add your skill markdown files with
                YAML frontmatter to see them listed here.
              </Typography>
            </Paper>
          )}

        {/* Empty State: Search filter has no match */}
        {!isLoading &&
          activeCategory.skillCount > 0 &&
          filteredSkills.length === 0 && (
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
                No skills match &ldquo;{searchQuery.trim()}&rdquo;
                {selectedCategory !== "all"
                  ? ` in ${activeCategory.label}`
                  : ""}
                .
              </Typography>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ justifyContent: "center", alignItems: "center" }}
              >
                {searchQuery && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSearchQuery("")}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    Clear search filter
                  </Button>
                )}
                {selectedCategory !== "all" && (
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setSelectedCategory("all")}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    Show all categories
                  </Button>
                )}
              </Stack>
            </Paper>
          )}

        {/* Skills List */}
        {!isLoading && filteredSkills.length > 0 && (
          <Stack spacing={2}>
            {filteredSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                source={sourcesMap.get(skill.sourceId)}
                match={matchMap.get(skill.id)}
                inPack={isSkillInPack ? isSkillInPack(skill) : false}
                onTogglePack={
                  onToggleSkillInPack
                    ? () => onToggleSkillInPack(skill)
                    : undefined
                }
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
