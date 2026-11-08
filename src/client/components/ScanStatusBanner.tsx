"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
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
      {/* Not Configured State */}
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
            No skill sources configured
          </Typography>
          <Typography variant="body2" sx={{ color: "#543714", mb: 2 }}>
            SkillMap scans local agent skills declared in <code>SKILL.md</code> files.
            To catalog your skills, configure <code>SKILL_SOURCES_JSON</code> (up to 16
            sources) or <code>SKILLS_ROOT</code> in your <code>.env.local</code> file
            and restart the development server:
          </Typography>
          <Box
            component="pre"
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              backgroundColor: "#f5eee2",
              color: "#3d2200",
              fontFamily: "monospace",
              fontSize: "0.825rem",
              overflowX: "auto",
              m: 0,
            }}
          >
            <code>
              {`SKILL_SOURCES_JSON=[{"id":"codex","label":"Codex skills","agent":"codex","root":"/absolute/path/to/codex/skills"},{"id":"shared","label":"Shared skills","agent":"shared","root":"/absolute/path/to/shared/skills"}]`}
            </code>
          </Box>
        </Paper>
      )}

      {/* Invalid Configuration (Fail-Closed) State */}
      {scanInfo.status === "invalid_configuration" && (
        <Alert severity="error">
          <AlertTitle sx={{ fontWeight: 700 }}>
            Invalid Source Configuration (Fail-Closed)
          </AlertTitle>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {scanInfo.configurationError
              ? `[${scanInfo.configurationError.code}] ${scanInfo.configurationError.message}`
              : "SKILL_SOURCES_JSON contains an invalid configuration."}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            SkillMap failed closed to prevent unauthorized directory access. No
            folders were scanned. Please correct your <code>.env.local</code> settings.
          </Typography>
        </Alert>
      )}

      {/* Partial Scan State (Multiple Sources) */}
      {scanInfo.status === "partial" && (
        <Alert severity="warning">
          <AlertTitle sx={{ fontWeight: 700 }}>
            Partial Scan Completed
          </AlertTitle>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Some configured skill sources were scanned successfully, while others
            encountered directory errors or were skipped due to the aggregate candidate
            limit.
          </Typography>

          {scanInfo.sources && scanInfo.sources.length > 0 && (
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              {scanInfo.sources.map((src) => (
                <Stack
                  key={src.id}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center", flexWrap: "wrap" }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {src.label} ({src.agent}):
                  </Typography>
                  <Chip
                    size="small"
                    label={
                      src.status === "ready"
                        ? `Ready (${src.count} skills)`
                        : src.status === "invalid_root"
                        ? "Invalid root directory"
                        : src.status === "unavailable"
                        ? "Source unavailable"
                        : "Skipped (aggregate limit)"
                    }
                    color={
                      src.status === "ready"
                        ? "success"
                        : src.status === "skipped"
                        ? "warning"
                        : "error"
                    }
                    variant="outlined"
                    sx={{ height: 20, fontSize: "0.7rem", borderRadius: 1 }}
                  />
                </Stack>
              ))}
            </Stack>
          )}
        </Alert>
      )}

      {/* Invalid Root State */}
      {scanInfo.status === "invalid_root" && (
        <Alert severity="error">
          <AlertTitle sx={{ fontWeight: 600 }}>
            Configured skill directory is invalid
          </AlertTitle>
          The configured path does not exist, is not a regular directory, or is a
          prohibited path (such as filesystem root, home directory, or a symlink).
          Please provide a valid, safe absolute directory in your <code>.env.local</code>.
        </Alert>
      )}

      {/* Unavailable State */}
      {scanInfo.status === "unavailable" && (
        <Alert severity="error">
          <AlertTitle sx={{ fontWeight: 600 }}>
            Skills scanner is unavailable
          </AlertTitle>
          The server was unable to access the skills directory. Check file system
          permissions and verify that the folder is readable by the Node.js process.
        </Alert>
      )}

      {/* Warnings Panel */}
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
                <li key={`${w.code}-${w.sourceId}-${idx}`}>
                  <strong>{w.code}</strong> [{w.sourceId}]: {w.message}
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
