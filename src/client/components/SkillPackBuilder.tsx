"use client";

import { useId, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { SkillSummary } from "@/src/contracts/api";
import {
  MAX_SAVED_SKILL_PACKS,
  MAX_SKILL_PACK_NAME_CHARACTERS,
  MAX_SKILL_PACK_PROJECT_DESCRIPTION_CHARACTERS,
  MAX_SKILL_PACK_SELECTIONS,
  PACK_AGENT_ROLES,
  type PackAgentRole,
  type SkillPackSelectionV1,
  type SkillPackV1,
} from "@/src/contracts/skill-pack";
import {
  removeSelectionFromPack,
  updateSelectionRole,
} from "../packs/builder-state";
import { selectionReferenceKey } from "../packs/model";
import { reconcileSkillPackSelections } from "../packs/reconcile";
import {
  buildSkillPackFilename,
  serializeSkillPackJson,
  serializeSkillPackMarkdown,
} from "../packs/serialization";
import { validateSkillPack } from "../packs/validation";
import {
  CheckIcon,
  DownloadIcon,
  FileIcon,
  PackageIcon,
  PlusIcon,
  TrashIcon,
  UploadIcon,
  WarningIcon,
} from "./Icons";
import { SkillPackImportDialog } from "./SkillPackImportDialog";

interface SkillPackBuilderProps {
  activePack: SkillPackV1;
  savedPacks: SkillPackV1[];
  catalog: SkillSummary[];
  storageError: string | null;
  onUpdateActivePack: (pack: SkillPackV1) => void;
  onSelectPack: (packId: string) => void;
  onCreateNewPack: () => void;
  onSavePack: () => void;
  onDeletePack: (packId: string) => void;
  onImportPack: (pack: SkillPackV1) => void;
  onBrowseCatalog?: () => void;
}

function triggerBrowserDownload(
  content: string,
  filename: string,
  mimeType: string,
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function SkillPackBuilder({
  activePack,
  savedPacks,
  catalog,
  storageError,
  onUpdateActivePack,
  onSelectPack,
  onCreateNewPack,
  onSavePack,
  onDeletePack,
  onImportPack,
  onBrowseCatalog,
}: SkillPackBuilderProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(
    null,
  );
  const [exportError, setExportError] = useState<string | null>(null);

  const nameInputId = useId();
  const descInputId = useId();
  const roleSelectLabelId = useId();

  // Reconcile selections against the current catalog
  const reconciledSelections = useMemo(() => {
    return reconcileSkillPackSelections(activePack.selections, catalog);
  }, [activePack.selections, catalog]);

  const unavailableCount = useMemo(() => {
    return reconciledSelections.filter((r) => r.availability === "unavailable")
      .length;
  }, [reconciledSelections]);

  const nameValidation = useMemo(() => {
    const trimmed = activePack.name.trim();
    if (!trimmed) {
      return { valid: false, error: "Pack name is required." };
    }
    if (trimmed.length > MAX_SKILL_PACK_NAME_CHARACTERS) {
      return {
        valid: false,
        error: `Pack name cannot exceed ${MAX_SKILL_PACK_NAME_CHARACTERS} characters.`,
      };
    }
    return { valid: true, error: null };
  }, [activePack.name]);

  const descValidation = useMemo(() => {
    if (
      activePack.projectDescription.length >
      MAX_SKILL_PACK_PROJECT_DESCRIPTION_CHARACTERS
    ) {
      return {
        valid: false,
        error: `Description cannot exceed ${MAX_SKILL_PACK_PROJECT_DESCRIPTION_CHARACTERS} characters.`,
      };
    }
    return { valid: true, error: null };
  }, [activePack.projectDescription]);

  const isPackValid = nameValidation.valid && descValidation.valid;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaveSuccessMessage(null);
    setExportError(null);
    onUpdateActivePack({
      ...activePack,
      name: e.target.value,
    });
  };

  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSaveSuccessMessage(null);
    setExportError(null);
    onUpdateActivePack({
      ...activePack,
      projectDescription: e.target.value,
    });
  };

  const handlePackSwitch = (e: SelectChangeEvent<string>) => {
    setSaveSuccessMessage(null);
    setExportError(null);
    onSelectPack(e.target.value);
  };

  const handleRoleChange = (
    selection: SkillPackSelectionV1,
    newRole: PackAgentRole,
  ) => {
    setSaveSuccessMessage(null);
    const updated = updateSelectionRole(
      activePack,
      {
        skillId: selection.skillId,
        sourceId: selection.sourceId,
        relativePath: selection.relativePath,
      },
      newRole,
    );
    onUpdateActivePack(updated);
  };

  const handleRemoveSelection = (selection: SkillPackSelectionV1) => {
    setSaveSuccessMessage(null);
    const updated = removeSelectionFromPack(activePack, {
      skillId: selection.skillId,
      sourceId: selection.sourceId,
      relativePath: selection.relativePath,
    });
    onUpdateActivePack(updated);
  };

  const handleSaveClick = () => {
    if (!isPackValid) return;
    const validation = validateSkillPack(activePack);
    if (!validation.ok) {
      setExportError(
        `Cannot save invalid pack: ${validation.issues
          .map((i) => i.message)
          .join("; ")}`,
      );
      return;
    }
    onSavePack();
    setSaveSuccessMessage("Skill pack successfully saved to browser storage.");
  };

  const handleExportJson = () => {
    setExportError(null);
    try {
      const json = serializeSkillPackJson(activePack);
      const filename = buildSkillPackFilename(activePack.name, "json");
      triggerBrowserDownload(
        json,
        filename,
        "application/json;charset=utf-8",
      );
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Failed to export JSON manifest.",
      );
    }
  };

  const handleExportMarkdown = () => {
    setExportError(null);
    try {
      const markdown = serializeSkillPackMarkdown(activePack);
      const filename = buildSkillPackFilename(activePack.name, "md");
      triggerBrowserDownload(
        markdown,
        filename,
        "text/markdown;charset=utf-8",
      );
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : "Failed to export Markdown document.",
      );
    }
  };

  const handleConfirmDelete = () => {
    onDeletePack(activePack.id);
    setDeleteDialogOpen(false);
  };

  const isSavedPack = savedPacks.some((p) => p.id === activePack.id);

  return (
    <Box component="section" aria-labelledby="pack-builder-heading">
      <Stack spacing={3}>
        {/* Top Control Bar: Pack Switcher, New Pack, Import */}
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 2,
            backgroundColor: "background.paper",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            sx={{
              justifyContent: "space-between",
              alignItems: { xs: "stretch", md: "center" },
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ alignItems: { xs: "stretch", sm: "center" }, flexGrow: 1 }}
            >
              <Typography
                component="h2"
                id="pack-builder-heading"
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: "text.primary",
                  whiteSpace: "nowrap",
                }}
              >
                Project Skill Pack
              </Typography>

              {savedPacks.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 200, maxWidth: 360 }}>
                  <InputLabel id="saved-pack-select-label">Active Pack</InputLabel>
                  <Select
                    labelId="saved-pack-select-label"
                    value={activePack.id}
                    label="Active Pack"
                    onChange={handlePackSwitch}
                    sx={{ borderRadius: 1.5 }}
                  >
                    {savedPacks.map((pack) => (
                      <MenuItem key={pack.id} value={pack.id}>
                        {pack.name} ({pack.selections.length}{" "}
                        {pack.selections.length === 1 ? "skill" : "skills"})
                      </MenuItem>
                    ))}
                    {!isSavedPack && (
                      <MenuItem value={activePack.id}>
                        <em>{activePack.name || "Untitled Draft"} (Unsaved)</em>
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
              )}
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              sx={{ flexWrap: "wrap", rowGap: 1 }}
            >
              <Button
                variant="outlined"
                size="small"
                onClick={onCreateNewPack}
                startIcon={<PlusIcon sx={{ fontSize: 16 }} />}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                New Pack
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setImportDialogOpen(true)}
                startIcon={<UploadIcon sx={{ fontSize: 16 }} />}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Import Pack
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Feedback Banners */}
        {storageError && (
          <Alert
            severity="error"
            icon={<WarningIcon sx={{ fontSize: 20 }} />}
          >
            {storageError}
          </Alert>
        )}

        {saveSuccessMessage && (
          <Alert
            severity="success"
            onClose={() => setSaveSuccessMessage(null)}
            icon={<CheckIcon sx={{ fontSize: 20 }} />}
          >
            {saveSuccessMessage}
          </Alert>
        )}

        {exportError && (
          <Alert
            severity="error"
            onClose={() => setExportError(null)}
            icon={<WarningIcon sx={{ fontSize: 20 }} />}
          >
            {exportError}
          </Alert>
        )}

        {savedPacks.length >= MAX_SAVED_SKILL_PACKS && !isSavedPack && (
          <Alert
            severity="warning"
            icon={<WarningIcon sx={{ fontSize: 20 }} />}
          >
            You have reached the maximum of {MAX_SAVED_SKILL_PACKS} saved skill
            packs. You can still export this pack or delete an old pack to save it.
          </Alert>
        )}

        {/* Metadata Editor & Actions */}
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.25, md: 3 },
            borderRadius: 2,
            backgroundColor: "background.paper",
          }}
        >
          <Stack spacing={2.5}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Pack Details
            </Typography>

            <TextField
              id={nameInputId}
              label="Skill Pack Name"
              required
              fullWidth
              value={activePack.name}
              onChange={handleNameChange}
              error={!nameValidation.valid}
              helperText={
                nameValidation.error ||
                `${activePack.name.length} / ${MAX_SKILL_PACK_NAME_CHARACTERS} characters`
              }
              slotProps={{
                htmlInput: {
                  maxLength: MAX_SKILL_PACK_NAME_CHARACTERS,
                  "aria-label": "Skill Pack Name",
                },
              }}
            />

            <Box>
              <TextField
                id={descInputId}
                label="Target Project Description"
                multiline
                rows={3}
                fullWidth
                value={activePack.projectDescription}
                onChange={handleDescChange}
                error={!descValidation.valid}
                helperText={`${activePack.projectDescription.length} / ${MAX_SKILL_PACK_PROJECT_DESCRIPTION_CHARACTERS} characters`}
                slotProps={{
                  htmlInput: {
                    maxLength: MAX_SKILL_PACK_PROJECT_DESCRIPTION_CHARACTERS,
                    "aria-label": "Target Project Description",
                  },
                }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.5 }}
              >
                Stored locally in browser storage. Do not include passwords, API
                keys, or private credentials.
              </Typography>
            </Box>

            {/* Action Buttons */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{
                justifyContent: "space-between",
                alignItems: { xs: "stretch", sm: "center" },
                pt: 1,
              }}
            >
              <Stack
                direction="row"
                spacing={1.25}
                sx={{ flexWrap: "wrap", rowGap: 1 }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveClick}
                  disabled={!isPackValid}
                  startIcon={<CheckIcon sx={{ fontSize: 18 }} />}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Save Pack
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleExportJson}
                  disabled={!isPackValid}
                  startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Export JSON
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleExportMarkdown}
                  disabled={!isPackValid}
                  startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Export Markdown
                </Button>
              </Stack>

              {isSavedPack && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setDeleteDialogOpen(true)}
                  startIcon={<TrashIcon sx={{ fontSize: 16 }} />}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Delete Pack
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>

        {/* Selected Skills Section */}
        <Box>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              mb: 2,
            }}
          >
            <Box>
              <Typography
                component="h3"
                variant="subtitle1"
                sx={{ fontWeight: 700, color: "text.primary" }}
              >
                Selected Skills ({activePack.selections.length} /{" "}
                {MAX_SKILL_PACK_SELECTIONS})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Assign manual roles to selected skills. Roles reflect operator
                intent, not verified compatibility.
              </Typography>
            </Box>

            {unavailableCount > 0 && (
              <Chip
                size="small"
                icon={<WarningIcon sx={{ fontSize: 14 }} />}
                label={`${unavailableCount} unavailable in current catalog`}
                color="warning"
                sx={{ fontWeight: 600, fontSize: "0.75rem" }}
              />
            )}
          </Stack>

          {/* Empty State */}
          {activePack.selections.length === 0 && (
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 3, sm: 5 },
                textAlign: "center",
                borderRadius: 2,
                backgroundColor: "background.paper",
              }}
            >
              <PackageIcon
                sx={{ fontSize: 44, color: "text.secondary", mb: 1.5, opacity: 0.6 }}
              />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                No skills in this pack yet
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ maxWidth: 440, mx: "auto", mb: 2.5 }}
              >
                Select skills from the Skills Inventory or from Project Matcher
                recommendations to assemble your pack.
              </Typography>
              {onBrowseCatalog && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={onBrowseCatalog}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Browse Skills Inventory
                </Button>
              )}
            </Paper>
          )}

          {/* Reconciled Selections List */}
          {activePack.selections.length > 0 && (
            <Stack spacing={1.5}>
              {reconciledSelections.map((resolved, index) => {
                const { selection, availability } = resolved;
                const isAvailable = availability === "available";
                const refKey = selectionReferenceKey(selection);

                return (
                  <Card
                    key={`${refKey}-${index}`}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 1.75,
                      backgroundColor: isAvailable
                        ? "background.paper"
                        : "#fffdfa",
                      borderColor: isAvailable ? "divider" : "#e6cfb3",
                    }}
                  >
                    <CardContent sx={{ p: "0 !important" }}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={2}
                        sx={{
                          justifyContent: "space-between",
                          alignItems: { xs: "stretch", md: "center" },
                        }}
                      >
                        {/* Skill Reference Information */}
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{
                              alignItems: "center",
                              flexWrap: "wrap",
                              rowGap: 0.5,
                              mb: 0.5,
                            }}
                          >
                            <Typography
                              component="h4"
                              variant="subtitle2"
                              sx={{
                                fontWeight: 700,
                                color: "text.primary",
                                fontSize: "0.95rem",
                              }}
                            >
                              {selection.name}
                            </Typography>

                            <Chip
                              size="small"
                              label={`Source: ${selection.sourceId}`}
                              variant="outlined"
                              sx={{
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                height: 20,
                              }}
                            />

                            {isAvailable ? (
                              <Chip
                                size="small"
                                icon={<CheckIcon sx={{ fontSize: 13 }} />}
                                label="Available"
                                color="success"
                                sx={{
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  height: 20,
                                }}
                              />
                            ) : (
                              <Chip
                                size="small"
                                icon={<WarningIcon sx={{ fontSize: 13 }} />}
                                label="Unavailable (missing or changed)"
                                color="warning"
                                sx={{
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  height: 20,
                                }}
                              />
                            )}
                          </Stack>

                          {/* Relative Path */}
                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ alignItems: "center" }}
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
                                wordBreak: "break-all",
                              }}
                            >
                              {selection.relativePath}
                            </Typography>
                          </Stack>

                          {!isAvailable && (
                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                color: "#8a581e",
                                mt: 0.5,
                                fontSize: "0.725rem",
                              }}
                            >
                              This skill was moved, renamed, or deleted in the
                              catalog. The saved reference is retained.
                            </Typography>
                          )}
                        </Box>

                        {/* Role Assignment & Remove Controls */}
                        <Stack
                          direction="row"
                          spacing={1.5}
                          sx={{
                            alignItems: "center",
                            justifyContent: { xs: "space-between", md: "flex-end" },
                          }}
                        >
                          <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel id={`${roleSelectLabelId}-${index}`}>
                              Agent Role
                            </InputLabel>
                            <Select
                              labelId={`${roleSelectLabelId}-${index}`}
                              value={selection.role}
                              label="Agent Role"
                              onChange={(e) =>
                                handleRoleChange(
                                  selection,
                                  e.target.value as PackAgentRole,
                                )
                              }
                              sx={{ borderRadius: 1.5, fontSize: "0.85rem" }}
                            >
                              {PACK_AGENT_ROLES.map((role) => (
                                <MenuItem key={role} value={role}>
                                  {role === "unassigned"
                                    ? "Unassigned"
                                    : role.charAt(0).toUpperCase() +
                                      role.slice(1)}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          <IconButton
                            size="small"
                            color="default"
                            onClick={() => handleRemoveSelection(selection)}
                            aria-label={`Remove ${selection.name} from pack`}
                            sx={{
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 1.5,
                              p: 1,
                              "&:hover": {
                                color: "error.main",
                                borderColor: "error.light",
                                backgroundColor: "rgba(211, 47, 47, 0.04)",
                              },
                            }}
                          >
                            <TrashIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Box>
      </Stack>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-pack-dialog-title"
      >
        <DialogTitle id="delete-pack-dialog-title" sx={{ fontWeight: 700 }}>
          Delete Skill Pack?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete &ldquo;{activePack.name}&rdquo;?
            This will permanently remove it from your saved browser packs.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Delete Pack
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Pack Dialog */}
      <SkillPackImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={onImportPack}
        savedPackCount={savedPacks.length}
      />
    </Box>
  );
}
