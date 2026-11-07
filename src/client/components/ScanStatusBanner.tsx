"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ApiWarning, ScanInfo } from "@/src/contracts/api";

interface ScanStatusBannerProps {
  scanInfo: ScanInfo | null;
  warnings: ApiWarning[];
  apiError: string | null;
  onRetry?: () => void;
}

export function ScanStatusBanner({
  scanInfo,
  warnings,
  apiError,
  onRetry,
}: ScanStatusBannerProps) {
  const [warningsExpanded, setWarningsExpanded] = useState(false);

  // If there's a top-level API fetch error
  if (apiError) {
    return (
      <Box sx={{ mb: 3 }}>
        <Alert
          severity="error"
          action={
            onRetry && (
              <Button color="inherit" size="small" onClick={onRetry}>
                Retry
              </Button>
            )
          }
        >
          <AlertTitle sx={{ fontWeight: 600 }}>API Connection Error</AlertTitle>
          {apiError}
        </Alert>
      </Box>
    );
  }

  if (!scanInfo) {
    return null;
  }

  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      {scanInfo.status === "not_configured" && (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, md: 3 },
            backgroundColor: "#fffdfa",
            borderColor: "#ebdcc6",
            borderRadius: 2,
          }}
        >
          <Typography
            component="h2"
            variant="subtitle1"
            sx={{ fontWeight: 700, color: "#7a4100", mb: 1 }}
          >
            No skills directory configured
          </Typography>
          <Typography variant="body2" sx={{ color: "#543714", mb: 2 }}>
            SkillMap scans local agent skills declared in <code>SKILL.md</code> files.
            To catalog your skills, set an absolute path for <code>SKILLS_ROOT</code>{" "}
            in your <code>.env.local</code> file and restart the development server:
          </Typography>
          <Box
            component="pre"
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              backgroundColor: "#f5eee2",
              color: "#3d2200",
              fontFamily: "monospace",
              fontSize: "0.85rem",
              overflowX: "auto",
              m: 0,
            }}
          >
            <code>SKILLS_ROOT=/absolute/path/to/your/skills</code>
          </Box>
        </Paper>
      )}

      {scanInfo.status === "invalid_root" && (
        <Alert severity="error">
          <AlertTitle sx={{ fontWeight: 600 }}>
            Configured SKILLS_ROOT directory is invalid
          </AlertTitle>
          The configured path does not exist, is not a regular directory, or is a
          prohibited path (such as filesystem root, home directory, or a symlink).
          Please provide a valid, safe absolute directory in your <code>.env.local</code>.
        </Alert>
      )}

      {scanInfo.status === "unavailable" && (
        <Alert severity="error">
          <AlertTitle sx={{ fontWeight: 600 }}>
            Skills scanner is unavailable
          </AlertTitle>
          The server was unable to access the skills directory. Check file system
          permissions and verify that the folder is readable by the Node.js process.
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => setWarningsExpanded((prev) => !prev)}
              aria-expanded={warningsExpanded}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {warningsExpanded ? "Hide details" : `View details (${warnings.length})`}
            </Button>
          }
        >
          <AlertTitle sx={{ fontWeight: 600 }}>
            {warnings.length} scan {warnings.length === 1 ? "warning" : "warnings"}{" "}
            reported
          </AlertTitle>
          <Typography variant="body2">
            Some skill files contained malformed metadata, exceeded size limits, or
            could not be read. They were safely skipped.
          </Typography>

          <Collapse in={warningsExpanded} timeout="auto" unmountOnExit>
            <Box
              component="ul"
              sx={{
                mt: 1.5,
                mb: 0,
                pl: 2.5,
                fontSize: "0.825rem",
                "& li": { mb: 0.5 },
              }}
            >
              {warnings.map((w, idx) => (
                <li key={`${w.code}-${idx}`}>
                  <strong>{w.code}</strong>: {w.message}
                  {w.relativePath && (
                    <Box
                      component="span"
                      sx={{
                        ml: 1,
                        px: 0.75,
                        py: 0.2,
                        borderRadius: 1,
                        backgroundColor: "rgba(0,0,0,0.06)",
                        fontFamily: "monospace",
                        fontSize: "0.775rem",
                      }}
                    >
                      {w.relativePath}
                    </Box>
                  )}
                </li>
              ))}
            </Box>
          </Collapse>
        </Alert>
      )}
    </Stack>
  );
}
