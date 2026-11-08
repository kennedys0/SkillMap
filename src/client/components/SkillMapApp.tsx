"use client";

import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import type {
  ApiWarning,
  ScanInfo,
  SkillMatch,
  SkillSummary,
} from "@/src/contracts/api";
import type { SkillPackV1 } from "@/src/contracts/skill-pack";
import { ClientApiError, fetchSkills, matchSkills } from "../api";
import {
  deleteSavedPack,
  isSkillSelectedInPack,
  toggleSelectionInPack,
  upsertSavedPack,
} from "../packs/builder-state";
import { createSkillPack } from "../packs/model";
import {
  loadSkillPacks,
  saveSkillPacks,
  type StorageLike,
} from "../packs/storage";
import { Header } from "./Header";
import { PackageIcon } from "./Icons";
import { ProjectMatcher } from "./ProjectMatcher";
import { ScanStatusBanner } from "./ScanStatusBanner";
import { SkillInventory } from "./SkillInventory";
import { SkillPackBuilder } from "./SkillPackBuilder";

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const storage = window.localStorage;
    const testKey = "__skillmap_storage_probe__";
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return storage;
  } catch {
    return null;
  }
}

function getInitialPacksState(): {
  savedPacks: SkillPackV1[];
  activePack: SkillPackV1;
  storageError: string | null;
} {
  const storage = getBrowserStorage();
  if (!storage) {
    return {
      savedPacks: [],
      activePack: createSkillPack({ name: "Untitled Pack" }),
      storageError: null,
    };
  }

  const loadResult = loadSkillPacks(storage);
  if (loadResult.ok) {
    return {
      savedPacks: loadResult.packs,
      activePack:
        loadResult.packs.length > 0
          ? loadResult.packs[0]
          : createSkillPack({ name: "Untitled Pack" }),
      storageError: null,
    };
  }

  return {
    savedPacks: [],
    activePack: createSkillPack({ name: "Untitled Pack" }),
    storageError: loadResult.error.message,
  };
}

export function SkillMapApp() {
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [scanInfo, setScanInfo] = useState<ScanInfo | null>(null);
  const [warnings, setWarnings] = useState<ApiWarning[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [matches, setMatches] = useState<SkillMatch[]>([]);
  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [hasRunMatch, setHasRunMatch] = useState<boolean>(false);

  // Skill Pack state initialized once from browser storage
  const [currentTab, setCurrentTab] = useState<"catalog" | "pack">("catalog");
  const [initialPacks] = useState(() => getInitialPacksState());
  const [savedPacks, setSavedPacks] = useState<SkillPackV1[]>(
    () => initialPacks.savedPacks,
  );
  const [activePack, setActivePack] = useState<SkillPackV1>(
    () => initialPacks.activePack,
  );
  const [storageError, setStorageError] = useState<string | null>(
    () => initialPacks.storageError,
  );

  // Initial load on mount: fetch catalog
  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const response = await fetchSkills();
        if (!cancelled) {
          setSkills(response.data.skills);
          setScanInfo(response.data.scan);
          setWarnings(response.warnings);
          setApiError(null);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ClientApiError) {
            setApiError(err.message);
          } else {
            setApiError(
              "Unable to connect to SkillMap server. Please try again.",
            );
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  // Manual rescan handler - strictly invalidates stale match recommendations
  // while preserving active pack selections across rescanning
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);

    // Invalidate stale match results upon rescanning per design requirements
    setMatches([]);
    setHasRunMatch(false);
    setMatchError(null);

    try {
      const response = await fetchSkills();
      setSkills(response.data.skills);
      setScanInfo(response.data.scan);
      setWarnings(response.warnings);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setApiError(err.message);
      } else {
        setApiError("Unable to connect to SkillMap server. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleMatch = async (projectDescription: string) => {
    setIsMatching(true);
    setMatchError(null);
    try {
      const response = await matchSkills(projectDescription);
      setMatches(response.data.matches);
      setHasRunMatch(true);
      if (response.data.scan) {
        setScanInfo(response.data.scan);
      }
      if (response.warnings && response.warnings.length > 0) {
        setWarnings(response.warnings);
      }
    } catch (err) {
      if (err instanceof ClientApiError) {
        setMatchError(err.message);
      } else {
        setMatchError("Failed to match skills against project description.");
      }
    } finally {
      setIsMatching(false);
    }
  };

  const handleClearMatch = () => {
    setMatches([]);
    setMatchError(null);
    setHasRunMatch(false);
  };

  // Pack management handlers
  const isSkillInPack = useCallback(
    (skill: SkillSummary) => {
      return isSkillSelectedInPack(activePack, skill);
    },
    [activePack],
  );

  const handleToggleSkillInPack = useCallback(
    (skill: SkillSummary) => {
      setStorageError(null);
      setActivePack((prev) => {
        const result = toggleSelectionInPack(prev, skill);
        if (result.action === "limit_reached") {
          setStorageError("Cannot add more than 256 skills to a pack.");
          return prev;
        }
        return result.pack;
      });
    },
    [],
  );

  const handleSelectPack = useCallback(
    (packId: string) => {
      const found = savedPacks.find((p) => p.id === packId);
      if (found) {
        setActivePack(found);
      }
    },
    [savedPacks],
  );

  const handleCreateNewPack = useCallback(() => {
    const newPack = createSkillPack({ name: "Untitled Pack" });
    setActivePack(newPack);
    setCurrentTab("pack");
  }, []);

  const handleSavePack = useCallback(() => {
    const storage = getBrowserStorage();
    const upsertResult = upsertSavedPack(savedPacks, activePack);
    if (!upsertResult.ok) {
      setStorageError("Maximum of 50 saved skill packs reached.");
      return;
    }

    if (!storage) {
      setSavedPacks(upsertResult.packs);
      setStorageError(
        "Browser storage is unavailable. Pack is preserved in memory and can still be exported.",
      );
      return;
    }

    const saveResult = saveSkillPacks(storage, upsertResult.packs);
    if (saveResult.ok) {
      setSavedPacks(upsertResult.packs);
      setStorageError(null);
    } else {
      setStorageError(saveResult.error.message);
    }
  }, [activePack, savedPacks]);

  const handleDeletePack = useCallback(
    (packId: string) => {
      const remaining = deleteSavedPack(savedPacks, packId);
      const storage = getBrowserStorage();
      if (storage) {
        saveSkillPacks(storage, remaining);
      }
      setSavedPacks(remaining);
      if (activePack.id === packId) {
        if (remaining.length > 0) {
          setActivePack(remaining[0]);
        } else {
          setActivePack(createSkillPack({ name: "Untitled Pack" }));
        }
      }
    },
    [activePack.id, savedPacks],
  );

  const handleImportPack = useCallback(
    (importedPack: SkillPackV1) => {
      const upsertResult = upsertSavedPack(savedPacks, importedPack);
      const storage = getBrowserStorage();

      if (!upsertResult.ok) {
        setStorageError(
          "Maximum of 50 saved skill packs reached. Imported pack is kept in memory.",
        );
        setActivePack(importedPack);
        setCurrentTab("pack");
        return;
      }

      if (storage) {
        const saveResult = saveSkillPacks(storage, upsertResult.packs);
        if (saveResult.ok) {
          setStorageError(null);
        } else {
          setStorageError(saveResult.error.message);
        }
      }

      setSavedPacks(upsertResult.packs);
      setActivePack(importedPack);
      setCurrentTab("pack");
    },
    [savedPacks],
  );

  const isScannerReady =
    scanInfo?.status === "ready" || scanInfo?.status === "partial";

  return (
    <Container
      maxWidth="xl"
      component="main"
      sx={{
        py: { xs: 2, sm: 3, md: 4 },
        px: { xs: 1.5, sm: 2.5, md: 3.5 },
      }}
    >
      <Header
        scanInfo={scanInfo}
        isLoading={isLoading}
        onRefresh={handleRefresh}
      />

      <ScanStatusBanner
        scanInfo={scanInfo}
        warnings={warnings}
        apiError={apiError}
        onRetry={handleRefresh}
      />

      {/* Navigation Tabs between Catalog & Pack Builder */}
      <Box sx={{ mb: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: "stretch", sm: "center" },
          }}
        >
          <Tabs
            value={currentTab}
            onChange={(_, val) => setCurrentTab(val)}
            aria-label="SkillMap Navigation Views"
            sx={{
              minHeight: 44,
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.95rem",
                minHeight: 44,
                px: 2,
              },
            }}
          >
            <Tab
              value="catalog"
              label="Skill Catalog & Matcher"
              id="tab-catalog"
              aria-controls="tabpanel-catalog"
            />
            <Tab
              value="pack"
              label={`Skill Pack Builder (${activePack.selections.length})`}
              id="tab-pack"
              aria-controls="tabpanel-pack"
              icon={<PackageIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
            />
          </Tabs>

          {currentTab === "catalog" && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setCurrentTab("pack")}
              startIcon={<PackageIcon sx={{ fontSize: 16 }} />}
              sx={{
                textTransform: "none",
                fontSize: "0.825rem",
                borderRadius: 2,
                borderColor: "primary.main",
                color: "primary.main",
              }}
            >
              Active Pack: <strong>{activePack.name || "Untitled"}</strong> (
              {activePack.selections.length} selected)
            </Button>
          )}
        </Stack>
      </Box>

      {/* View 1: Catalog & Matcher */}
      {currentTab === "catalog" && (
        <Box
          id="tabpanel-catalog"
          role="tabpanel"
          aria-labelledby="tab-catalog"
          sx={{ flexGrow: 1 }}
        >
          <Grid container spacing={{ xs: 2.5, md: 3.5 }}>
            {/* Left Column: Skills Inventory */}
            <Grid size={{ xs: 12, md: 7, lg: 7.5 }}>
              <SkillInventory
                skills={skills}
                sources={scanInfo?.sources}
                isLoading={isLoading}
                matches={matches}
                scannerReady={isScannerReady}
                isSkillInPack={isSkillInPack}
                onToggleSkillInPack={handleToggleSkillInPack}
              />
            </Grid>

            {/* Right Column: Project Matcher Form & Results */}
            <Grid size={{ xs: 12, md: 5, lg: 4.5 }}>
              <ProjectMatcher
                skills={skills}
                sources={scanInfo?.sources}
                matches={matches}
                isMatching={isMatching}
                matchError={matchError}
                hasRunMatch={hasRunMatch}
                onMatch={handleMatch}
                onClear={handleClearMatch}
                isSkillInPack={isSkillInPack}
                onToggleSkillInPack={handleToggleSkillInPack}
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* View 2: Skill Pack Builder */}
      {currentTab === "pack" && (
        <Box
          id="tabpanel-pack"
          role="tabpanel"
          aria-labelledby="tab-pack"
          sx={{ flexGrow: 1 }}
        >
          <SkillPackBuilder
            activePack={activePack}
            savedPacks={savedPacks}
            catalog={skills}
            storageError={storageError}
            onUpdateActivePack={setActivePack}
            onSelectPack={handleSelectPack}
            onCreateNewPack={handleCreateNewPack}
            onSavePack={handleSavePack}
            onDeletePack={handleDeletePack}
            onImportPack={handleImportPack}
            onBrowseCatalog={() => setCurrentTab("catalog")}
          />
        </Box>
      )}
    </Container>
  );
}
