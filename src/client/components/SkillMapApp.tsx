"use client";

import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import type {
  ApiWarning,
  ScanInfo,
  SkillMatch,
  SkillSummary,
} from "@/src/contracts/api";
import { ClientApiError, fetchSkills, matchSkills } from "../api";
import { Header } from "./Header";
import { ProjectMatcher } from "./ProjectMatcher";
import { ScanStatusBanner } from "./ScanStatusBanner";
import { SkillInventory } from "./SkillInventory";

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

  // Initial load on mount
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
            setApiError("Unable to connect to SkillMap server. Please try again.");
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

      <Box sx={{ flexGrow: 1 }}>
        <Grid container spacing={{ xs: 2.5, md: 3.5 }}>
          {/* Left Column: Skills Inventory (Efficient desktop space, stacked mobile) */}
          <Grid size={{ xs: 12, md: 7, lg: 7.5 }}>
            <SkillInventory
              skills={skills}
              sources={scanInfo?.sources}
              isLoading={isLoading}
              matches={matches}
              scannerReady={isScannerReady}
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
            />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}
