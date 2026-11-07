"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ScanInfo } from "@/src/contracts/api";
import { CheckIcon, InfoIcon, RefreshIcon, WarningIcon } from "./Icons";

interface HeaderProps {
  scanInfo: ScanInfo | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function Header({ scanInfo, isLoading, onRefresh }: HeaderProps) {
  let statusLabel = "Checking scanner...";
  let statusColor: "default" | "success" | "warning" | "error" = "default";
  let StatusIcon = InfoIcon;

  if (isLoading && !scanInfo) {
    statusLabel = "Scanning skills...";
    statusColor = "default";
  } else if (scanInfo) {
    switch (scanInfo.status) {
      case "ready":
        statusLabel = `${scanInfo.skillCount} ${
          scanInfo.skillCount === 1 ? "skill" : "skills"
        } discovered`;
        statusColor = "success";
        StatusIcon = CheckIcon;
        break;
      case "not_configured":
        statusLabel = "SKILLS_ROOT not configured";
        statusColor = "warning";
        StatusIcon = WarningIcon;
        break;
      case "invalid_root":
        statusLabel = "Invalid SKILLS_ROOT directory";
        statusColor = "error";
        StatusIcon = WarningIcon;
        break;
      case "unavailable":
        statusLabel = "Scanner unavailable";
        statusColor = "error";
        StatusIcon = WarningIcon;
        break;
    }
  }

  return (
    <Box
      component="header"
      sx={{
        py: { xs: 2.5, md: 3.5 },
        borderBottom: "1px solid",
        borderColor: "divider",
        mb: { xs: 3, md: 4 },
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
        }}
      >
        <Box>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: "center", mb: 0.5 }}
          >
            <Typography
              component="h1"
              variant="h4"
              sx={{
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "text.primary",
                fontSize: { xs: "1.65rem", sm: "2rem" },
              }}
            >
              MOCHI SkillMap
            </Typography>
            <Chip
              size="small"
              icon={<StatusIcon sx={{ fontSize: 16 }} />}
              label={statusLabel}
              color={statusColor}
              variant="outlined"
              sx={{
                fontWeight: 500,
                fontSize: "0.775rem",
                borderRadius: 2,
                height: 26,
              }}
            />
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 640, lineHeight: 1.5 }}
          >
            A private, local catalog of installed agent skills. Deterministic
            keyword matching with zero external indexing, telemetry, or remote
            transmission.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          size="medium"
          startIcon={
            <RefreshIcon
              sx={{
                animation: isLoading ? "spin 1s linear infinite" : "none",
                "@keyframes spin": {
                  "0%": { transform: "rotate(0deg)" },
                  "100%": { transform: "rotate(360deg)" },
                },
              }}
            />
          }
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Refresh skills catalog"
          sx={{
            minHeight: 40,
            textTransform: "none",
            fontWeight: 600,
            borderColor: "divider",
            color: "text.primary",
            "&:hover": {
              borderColor: "primary.main",
              backgroundColor: "rgba(49, 92, 76, 0.04)",
            },
          }}
        >
          {isLoading ? "Scanning..." : "Rescan catalog"}
        </Button>
      </Stack>
    </Box>
  );
}
